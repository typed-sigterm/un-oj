/** General contest information. */
export interface Contest<
  Problem = unknown,
  Format extends string | number | undefined = string | number | undefined,
> {
  id: string
  title: string
  description: string
  format: Format
  startTime?: Date
  endTime?: Date
  problems: Problem extends never ? never : Problem[]
  authors?: string[]
  type?: string
}
