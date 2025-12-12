/** General contest information. */
export interface Contest<
  Problem = unknown,
  Format extends string | number | undefined = string | number | undefined,
  Phase extends string | undefined = string | undefined,
> {
  id: string
  title: string
  description: string
  format: Format
  phase?: Phase
  startTime?: Date
  endTime?: Date
  problems: Problem extends never ? never : Problem[]
  authors?: string[]
  type?: string
}
