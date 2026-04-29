import { Client } from '@notionhq/client';
import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.js';
import type { Logger } from '../utils/logger.js';
import type { FoodItem, FoodMutationInput } from '../types/food.js';
import {
  buildFoodCreateProperties,
  buildFoodUpdateProperties,
  mapNotionPageToFoodItem,
  type DatabasePropertyShape,
  type NotionPropertyKind
} from './mapper.js';

const SOFT_DELETE_STATUS = 'Removed';
const ACTIVE_EXCLUDED_STATUSES = new Set(['Removed', 'Used']);

function isFullPage(page: unknown): page is { id: string; properties: Record<string, unknown> } {
  return Boolean(page && typeof page === 'object' && 'id' in page && 'properties' in page);
}

function getPropertyKind(property: unknown): NotionPropertyKind | null {
  if (!property || typeof property !== 'object' || !('type' in property)) {
    return null;
  }

  const type = property.type;
  return type === 'title' ||
    type === 'date' ||
    type === 'rich_text' ||
    type === 'number' ||
    type === 'select'
    ? type
    : null;
}

export class NotionFoodService {
  private readonly notion: Client;
  private propertyShape: DatabasePropertyShape | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly databaseId: string,
    private readonly logger: Logger,
    private readonly dryRun = false
  ) {
    this.notion = new Client({ auth: apiKey });
  }

  async ensureSchema(): Promise<DatabasePropertyShape> {
    if (this.propertyShape) {
      return this.propertyShape;
    }

    const database = await this.notion.databases.retrieve({
      database_id: this.databaseId
    });

    const propertyShape: DatabasePropertyShape = {};
    for (const [name, property] of Object.entries(database.properties)) {
      const kind = getPropertyKind(property);
      if (kind) {
        propertyShape[name] = kind;
      }
    }

    this.propertyShape = propertyShape;
    return propertyShape;
  }

  async addFood(input: FoodMutationInput): Promise<FoodItem> {
    const schema = await this.ensureSchema();

    if (this.dryRun) {
      return {
        id: 'dry-run',
        name: input.itemName,
        expirationDate: input.expirationDate ?? null,
        location: input.location ?? null,
        quantity: input.quantity ?? null,
        category: input.category ?? null,
        status: input.status ?? 'Active',
        addedBy: input.addedBy ?? null,
        notes: input.notes ?? null,
        lastUpdated: new Date().toISOString()
      };
    }

    const page = await this.notion.pages.create({
      parent: {
        database_id: this.databaseId,
        type: 'database_id'
      },
      properties: buildFoodCreateProperties(schema, input)
    });

    if (!isFullPage(page)) {
      throw new Error('Unexpected Notion response when creating a food item');
    }

    return mapNotionPageToFoodItem(page);
  }

  async updateFood(pageId: string, input: Omit<FoodMutationInput, 'itemName'>): Promise<void> {
    const schema = await this.ensureSchema();

    if (this.dryRun) {
      this.logger.info('Dry run enabled. Skipping Notion update.', {
        pageId,
        input
      });
      return;
    }

    await this.notion.pages.update({
      page_id: pageId,
      properties: buildFoodUpdateProperties(schema, input)
    });
  }

  async softRemoveFood(pageId: string, status = SOFT_DELETE_STATUS): Promise<void> {
    await this.updateFood(pageId, { status });
  }

  async listActiveFoodItems(): Promise<FoodItem[]> {
    const pages = await this.queryDatabase();
    return pages.filter((item) => !ACTIVE_EXCLUDED_STATUSES.has(item.status ?? ''));
  }

  async findItemsExpiringWithin(days: number, timezone: string, now = new Date()): Promise<FoodItem[]> {
    const pages = await this.queryDatabase();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone
    }).format(now);

    return pages.filter((item) => {
      if (!item.expirationDate || ACTIVE_EXCLUDED_STATUSES.has(item.status ?? '')) {
        return false;
      }

      return item.expirationDate >= today && item.expirationDate <= addDays(today, days);
    });
  }

  async findExpiredItems(timezone: string, now = new Date()): Promise<FoodItem[]> {
    const pages = await this.queryDatabase();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone
    }).format(now);

    return pages.filter((item) => {
      if (!item.expirationDate || ACTIVE_EXCLUDED_STATUSES.has(item.status ?? '')) {
        return false;
      }

      return item.expirationDate < today;
    });
  }

  async markExpiredItems(): Promise<number> {
    const expired = await this.findExpiredItems('America/Los_Angeles');
    let updatedCount = 0;

    for (const item of expired) {
      if (item.status !== 'Expired') {
        await this.updateFood(item.id, { status: 'Expired' });
        updatedCount += 1;
      }
    }

    return updatedCount;
  }

  async findByName(name: string): Promise<FoodItem[]> {
    const pages = await this.queryDatabase({
      filter: {
        property: 'Name',
        title: {
          contains: name
        }
      }
    });

    const lowerName = name.trim().toLowerCase();
    const exactMatches = pages.filter((item) => item.name.toLowerCase() === lowerName);
    return exactMatches.length > 0 ? exactMatches : pages;
  }

  private async queryDatabase(query?: Pick<QueryDatabaseParameters, 'filter'>): Promise<FoodItem[]> {
    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      ...query
    });

    const items: FoodItem[] = [];

    for (const result of response.results) {
      if (isFullPage(result)) {
        items.push(mapNotionPageToFoodItem(result));
      }
    }

    return items;
  }
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
