import type { CreatePageParameters, UpdatePageParameters } from '@notionhq/client/build/src/api-endpoints.js';
import type { FoodItem, FoodMutationInput } from '../types/food.js';

export type NotionPropertyKind =
  | 'title'
  | 'date'
  | 'rich_text'
  | 'number'
  | 'select';

export interface DatabasePropertyShape {
  [propertyName: string]: NotionPropertyKind;
}

function buildRichText(content: string) {
  return [
    {
      type: 'text' as const,
      text: {
        content
      }
    }
  ];
}

function setTextOrSelect(
  propertyName: string,
  value: string | null | undefined,
  kind: NotionPropertyKind
) {
  if (!value) {
    return undefined;
  }

  if (kind === 'select') {
    return {
      [propertyName]: {
        select: {
          name: value
        }
      }
    };
  }

  return {
    [propertyName]: {
      rich_text: buildRichText(value)
    }
  };
}

function setNumber(propertyName: string, value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return {
      [propertyName]: {
        rich_text: buildRichText(value)
      }
    };
  }

  return {
    [propertyName]: {
      number: numericValue
    }
  };
}

export function buildFoodCreateProperties(
  schema: DatabasePropertyShape,
  input: FoodMutationInput
): NonNullable<CreatePageParameters['properties']> {
  return {
    Name: {
      title: buildRichText(input.itemName)
    },
    ...(input.expirationDate
      ? {
          Expiration: {
            date: {
              start: input.expirationDate
            }
          }
        }
      : {}),
    ...(schema.Location ? setTextOrSelect('Location', input.location, schema.Location) : {}),
    ...(schema.Quantity
      ? schema.Quantity === 'number'
        ? setNumber('Quantity', input.quantity)
        : setTextOrSelect('Quantity', input.quantity, schema.Quantity)
      : {}),
    ...(schema.Category ? setTextOrSelect('Category', input.category, schema.Category) : {}),
    ...(schema.Status ? setTextOrSelect('Status', input.status ?? 'Active', schema.Status) : {}),
    ...(schema['Added By'] ? setTextOrSelect('Added By', input.addedBy, schema['Added By']) : {}),
    ...(schema.Notes ? setTextOrSelect('Notes', input.notes, schema.Notes) : {}),
    ...(schema['Last Updated']
      ? {
          'Last Updated': {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      : {})
  };
}

export function buildFoodUpdateProperties(
  schema: DatabasePropertyShape,
  input: Omit<FoodMutationInput, 'itemName'>
): NonNullable<UpdatePageParameters['properties']> {
  return {
    ...(input.expirationDate
      ? {
          Expiration: {
            date: {
              start: input.expirationDate
            }
          }
        }
      : {}),
    ...(schema.Location ? setTextOrSelect('Location', input.location, schema.Location) : {}),
    ...(schema.Quantity
      ? schema.Quantity === 'number'
        ? setNumber('Quantity', input.quantity)
        : setTextOrSelect('Quantity', input.quantity, schema.Quantity)
      : {}),
    ...(schema.Category ? setTextOrSelect('Category', input.category, schema.Category) : {}),
    ...(schema.Status ? setTextOrSelect('Status', input.status, schema.Status) : {}),
    ...(schema['Added By'] ? setTextOrSelect('Added By', input.addedBy, schema['Added By']) : {}),
    ...(schema.Notes ? setTextOrSelect('Notes', input.notes, schema.Notes) : {}),
    ...(schema['Last Updated']
      ? {
          'Last Updated': {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      : {})
  };
}

function readPlainTextFromProperty(property: unknown): string | null {
  if (!property || typeof property !== 'object') {
    return null;
  }

  if ('rich_text' in property && Array.isArray(property.rich_text)) {
    return property.rich_text.map(readPlainTextValue).join('').trim() || null;
  }

  if ('title' in property && Array.isArray(property.title)) {
    return property.title.map(readPlainTextValue).join('').trim() || null;
  }

  if ('select' in property && property.select && typeof property.select === 'object' && 'name' in property.select) {
    return typeof property.select.name === 'string' ? property.select.name : null;
  }

  if ('number' in property && typeof property.number === 'number') {
    return String(property.number);
  }

  return null;
}

function readPlainTextValue(item: unknown): string {
  if (item && typeof item === 'object' && 'plain_text' in item && typeof item.plain_text === 'string') {
    return item.plain_text;
  }

  return '';
}

export function mapNotionPageToFoodItem(page: {
  id: string;
  properties: Record<string, unknown>;
}): FoodItem {
  const expirationProperty = page.properties.Expiration as { date?: { start?: string | null } } | undefined;
  const lastUpdatedProperty = page.properties['Last Updated'] as
    | { date?: { start?: string | null } }
    | undefined;

  return {
    id: page.id,
    name: readPlainTextFromProperty(page.properties.Name) ?? 'Untitled',
    expirationDate: expirationProperty?.date?.start ?? null,
    location: readPlainTextFromProperty(page.properties.Location),
    quantity: readPlainTextFromProperty(page.properties.Quantity),
    category: readPlainTextFromProperty(page.properties.Category),
    status: readPlainTextFromProperty(page.properties.Status),
    addedBy: readPlainTextFromProperty(page.properties['Added By']),
    notes: readPlainTextFromProperty(page.properties.Notes),
    lastUpdated: lastUpdatedProperty?.date?.start ?? null
  };
}
