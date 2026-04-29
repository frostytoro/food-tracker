import {
  ApplicationCommandOptionType,
  type RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';

export const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    name: 'add-food',
    description: 'Add a food item to the Notion database.',
    options: [
      {
        name: 'name',
        description: 'Food item name',
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'expiration',
        description: 'Expiration date, for example 2026-05-12 or next Friday',
        type: ApplicationCommandOptionType.String,
        required: false
      },
      {
        name: 'location',
        description: 'Where the item is stored',
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
      },
      {
        name: 'quantity',
        description: 'Quantity or amount',
        type: ApplicationCommandOptionType.String,
        required: false
      },
      {
        name: 'category',
        description: 'Category, such as produce or dairy',
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
      },
      {
        name: 'notes',
        description: 'Extra notes',
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ]
  },
  {
    name: 'update-food',
    description: 'Update an existing food item.',
    options: [
      {
        name: 'name',
        description: 'Existing food item name',
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'expiration',
        description: 'New expiration date',
        type: ApplicationCommandOptionType.String,
        required: false
      },
      {
        name: 'location',
        description: 'Updated location',
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
      },
      {
        name: 'quantity',
        description: 'Updated quantity',
        type: ApplicationCommandOptionType.String,
        required: false
      },
      {
        name: 'category',
        description: 'Updated category',
        type: ApplicationCommandOptionType.String,
        required: false,
        autocomplete: true
      },
      {
        name: 'notes',
        description: 'Updated notes',
        type: ApplicationCommandOptionType.String,
        required: false
      }
    ]
  },
  {
    name: 'remove-food',
    description: 'Soft remove a food item by marking its status.',
    options: [
      {
        name: 'name',
        description: 'Food item name',
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'status',
        description: 'Status to apply',
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: 'Removed', value: 'Removed' },
          { name: 'Used', value: 'Used' }
        ]
      }
    ]
  },
  {
    name: 'list-food',
    description: 'List non-expired food items in Notion.',
    options: [
      {
        name: 'page',
        description: 'Page number to view',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        min_value: 1
      }
    ]
  },
  {
    name: 'expiring',
    description: 'Show food items expiring within N days.',
    options: [
      {
        name: 'days',
        description: 'How many days ahead to check',
        type: ApplicationCommandOptionType.Integer,
        required: false
      }
    ]
  },
  {
    name: 'help',
    description: 'Show usage instructions for the food tracker bot.'
  }
];

