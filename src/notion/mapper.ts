import type { CreatePageParameters, UpdatePageParameters } from '@notionhq/client/build/src/api-endpoints.js';
import type { FoodItem, FoodMutationInput } from '../types/food.js';

export type NotionPropertyKind =
  | 'title'
  | 'date'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'last_edited_time';

export interface DatabasePropertyShape {
  [propertyName: string]: NotionPropertyKind;
}

const PROPERTY_ALIASES = {
  title: ['Name', 'Item'],
  expirationDate: ['Expiration', 'Expiration Date'],
  location: ['Location'],
  quantity: ['Quantity'],
  category: ['Category'],
  status: ['Status'],
  addedBy: ['Added By'],
  notes: ['Notes', 'Expiration Notes'],
  lastUpdated: ['Last Updated', 'Last edited time']
} as const;

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

  if (kind === 'multi_select') {
    return {
      [propertyName]: {
        multi_select: [{ name: value }]
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

function getExistingPropertyName(
  schema: DatabasePropertyShape,
  aliases: readonly string[]
): string | null {
  for (const alias of aliases) {
    if (alias in schema) {
      return alias;
    }
  }

  return null;
}

function setDateProperty(propertyName: string, value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return {
    [propertyName]: {
      date: {
        start: value
      }
    }
  };
}

function getExistingProperty(schema: DatabasePropertyShape, aliases: readonly string[]) {
  const propertyName = getExistingPropertyName(schema, aliases);
  if (!propertyName) {
    return null;
  }

  const kind = schema[propertyName];
  if (!kind) {
    return null;
  }

  return { propertyName, kind };
}

export function buildFoodCreateProperties(
  schema: DatabasePropertyShape,
  input: FoodMutationInput
): NonNullable<CreatePageParameters['properties']> {
  const titleProperty = getExistingPropertyName(schema, PROPERTY_ALIASES.title) ?? 'Name';
  const expirationProperty = getExistingProperty(schema, PROPERTY_ALIASES.expirationDate);
  const locationProperty = getExistingProperty(schema, PROPERTY_ALIASES.location);
  const quantityProperty = getExistingProperty(schema, PROPERTY_ALIASES.quantity);
  const categoryProperty = getExistingProperty(schema, PROPERTY_ALIASES.category);
  const statusProperty = getExistingProperty(schema, PROPERTY_ALIASES.status);
  const addedByProperty = getExistingProperty(schema, PROPERTY_ALIASES.addedBy);
  const notesProperty = getExistingProperty(schema, PROPERTY_ALIASES.notes);

  return {
    [titleProperty]: {
      title: buildRichText(input.itemName)
    },
    ...(expirationProperty ? setDateProperty(expirationProperty.propertyName, input.expirationDate) : {}),
    ...(locationProperty ? setTextOrSelect(locationProperty.propertyName, input.location, locationProperty.kind) : {}),
    ...(quantityProperty
      ? quantityProperty.kind === 'number'
        ? setNumber(quantityProperty.propertyName, input.quantity)
        : setTextOrSelect(quantityProperty.propertyName, input.quantity, quantityProperty.kind)
      : {}),
    ...(categoryProperty ? setTextOrSelect(categoryProperty.propertyName, input.category, categoryProperty.kind) : {}),
    ...(statusProperty ? setTextOrSelect(statusProperty.propertyName, input.status ?? 'Active', statusProperty.kind) : {}),
    ...(addedByProperty ? setTextOrSelect(addedByProperty.propertyName, input.addedBy, addedByProperty.kind) : {}),
    ...(notesProperty ? setTextOrSelect(notesProperty.propertyName, input.notes, notesProperty.kind) : {})
  };
}

export function buildFoodUpdateProperties(
  schema: DatabasePropertyShape,
  input: Omit<FoodMutationInput, 'itemName'>
): NonNullable<UpdatePageParameters['properties']> {
  const expirationProperty = getExistingProperty(schema, PROPERTY_ALIASES.expirationDate);
  const locationProperty = getExistingProperty(schema, PROPERTY_ALIASES.location);
  const quantityProperty = getExistingProperty(schema, PROPERTY_ALIASES.quantity);
  const categoryProperty = getExistingProperty(schema, PROPERTY_ALIASES.category);
  const statusProperty = getExistingProperty(schema, PROPERTY_ALIASES.status);
  const addedByProperty = getExistingProperty(schema, PROPERTY_ALIASES.addedBy);
  const notesProperty = getExistingProperty(schema, PROPERTY_ALIASES.notes);

  return {
    ...(expirationProperty ? setDateProperty(expirationProperty.propertyName, input.expirationDate) : {}),
    ...(locationProperty ? setTextOrSelect(locationProperty.propertyName, input.location, locationProperty.kind) : {}),
    ...(quantityProperty
      ? quantityProperty.kind === 'number'
        ? setNumber(quantityProperty.propertyName, input.quantity)
        : setTextOrSelect(quantityProperty.propertyName, input.quantity, quantityProperty.kind)
      : {}),
    ...(categoryProperty ? setTextOrSelect(categoryProperty.propertyName, input.category, categoryProperty.kind) : {}),
    ...(statusProperty ? setTextOrSelect(statusProperty.propertyName, input.status, statusProperty.kind) : {}),
    ...(addedByProperty ? setTextOrSelect(addedByProperty.propertyName, input.addedBy, addedByProperty.kind) : {}),
    ...(notesProperty ? setTextOrSelect(notesProperty.propertyName, input.notes, notesProperty.kind) : {})
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

  if ('multi_select' in property && Array.isArray(property.multi_select)) {
    return property.multi_select.map(readNamedOption).filter(Boolean).join(', ') || null;
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

function readNamedOption(item: unknown): string {
  if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
    return item.name;
  }

  return '';
}

function readDateStart(property: unknown): string | null {
  if (
    property &&
    typeof property === 'object' &&
    'date' in property &&
    property.date &&
    typeof property.date === 'object' &&
    'start' in property.date &&
    (typeof property.date.start === 'string' || property.date.start === null)
  ) {
    return property.date.start ?? null;
  }

  return null;
}

function readLastEditedTime(property: unknown): string | null {
  if (
    property &&
    typeof property === 'object' &&
    'last_edited_time' in property &&
    (typeof property.last_edited_time === 'string' || property.last_edited_time === null)
  ) {
    return property.last_edited_time ?? null;
  }

  return null;
}

export function mapNotionPageToFoodItem(page: {
  id: string;
  properties: Record<string, unknown>;
}): FoodItem {
  const expirationDate =
    'Expiration' in page.properties
      ? readDateStart(page.properties.Expiration)
      : readDateStart(page.properties['Expiration Date']);
  const lastUpdated =
    readDateStart(page.properties['Last Updated']) ??
    readLastEditedTime(page.properties['Last edited time']);

  return {
    id: page.id,
    name:
      readPlainTextFromProperty(page.properties.Name) ??
      readPlainTextFromProperty(page.properties.Item) ??
      'Untitled',
    expirationDate,
    location: readPlainTextFromProperty(page.properties.Location),
    quantity: readPlainTextFromProperty(page.properties.Quantity),
    category: readPlainTextFromProperty(page.properties.Category),
    status: readPlainTextFromProperty(page.properties.Status),
    addedBy: readPlainTextFromProperty(page.properties['Added By']),
    notes:
      readPlainTextFromProperty(page.properties.Notes) ??
      readPlainTextFromProperty(page.properties['Expiration Notes']),
    lastUpdated
  };
}
