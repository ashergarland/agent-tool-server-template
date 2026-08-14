import { z } from 'zod';
import type { Services } from '../services/index.js';

export interface ToolInvocationContext {
  readonly requestId: string;
  readonly principal: string;
}

export type ToolKind = 'read' | 'write';

export interface ToolDefinition<
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
> {
  readonly name: string;
  readonly title: string;
  readonly summary: string;
  /**
   * Primary model-routing signal for this tool. It is published to every transport, so it must be
   * explicit and self-contained while staying short enough to avoid wasting caller context.
   *
   * Every description must state:
   * - when to use the tool (the request shapes it answers);
   * - when not to use it (out-of-scope requests);
   * - prerequisites (inputs or prior tool calls required before it can succeed);
   * - preferred alternatives (which tool to use instead, by name);
   * - side effects (read-only, or what it mutates and which confirmation it requires).
   */
  readonly description: string;
  readonly kind: ToolKind;
  readonly inputSchema: InputSchema;
  readonly outputSchema: OutputSchema;
  readonly handler: (
    input: z.output<InputSchema>,
    services: Services,
    context: ToolInvocationContext,
  ) => Promise<z.output<OutputSchema>>;
}

export const defineTool = <InputSchema extends z.ZodType, OutputSchema extends z.ZodType>(
  definition: ToolDefinition<InputSchema, OutputSchema>,
): ToolDefinition<InputSchema, OutputSchema> => definition;

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['pending', 'complete']),
});

export const listItemsTool = defineTool({
  name: 'example_list_items',
  title: 'List example items',
  summary: 'List items from the replaceable example provider.',
  description:
    'Use to discover example items when no identifier is known, or to confirm which identifiers exist. ' +
    'Do not use when the identifier is already known; use example_get_item instead. ' +
    'No prerequisites and no inputs. Read-only: returns data and changes nothing.',
  kind: 'read',
  inputSchema: z.object({}),
  outputSchema: z.object({ items: z.array(itemSchema) }),
  handler: async (_input, services) => ({ items: [...(await services.items.list())] }),
});

export const getItemTool = defineTool({
  name: 'example_get_item',
  title: 'Get an example item',
  summary: 'Get one item by identifier.',
  description:
    'Use to read one example item when its identifier is known, including before proposing any update. ' +
    'Do not use to search or browse; use example_list_items to find an identifier first. ' +
    'Prerequisite: a valid item id. Read-only: returns data and changes nothing.',
  kind: 'read',
  inputSchema: z.object({ id: z.string().min(1).max(100) }),
  outputSchema: z.object({ item: itemSchema }),
  handler: async (input, services) => ({ item: await services.items.get(input.id) }),
});

export const updateItemTool = defineTool({
  name: 'example_update_item',
  title: 'Update an example item',
  summary: 'Preview or update an item status.',
  description:
    'Use only when the user explicitly asks to preview or change an item status. ' +
    'Do not use to read state; use example_get_item or example_list_items instead. ' +
    'Prerequisites: a valid item id and the current state read first. ' +
    'Side effects: with dryRun=true it previews without writing; execution writes the new status and ' +
    'requires explicit user approval with dryRun=false and confirm=true.',
  kind: 'write',
  inputSchema: z.object({
    id: z.string().min(1).max(100),
    status: z.enum(['pending', 'complete']),
    dryRun: z.boolean().default(false),
    confirm: z.boolean().default(false),
  }),
  outputSchema: z.object({ item: itemSchema, performed: z.boolean(), dryRun: z.boolean() }),
  handler: (input, services) => services.items.updateStatus(input),
});

export const toolDefinitions = [
  listItemsTool,
  getItemTool,
  updateItemTool,
] as const satisfies readonly ToolDefinition[];
