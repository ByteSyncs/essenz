export interface QuizOption {
  value: string
  label: string
  sub: string
}

export interface QuizStep {
  id: string
  question: string
  emoji: string
  options: QuizOption[]
}

export interface CoffeeResult {
  title: string
  desc: string
  tag: string
}

export interface CoffeeQuizData {
  steps: QuizStep[]
  results: Record<string, CoffeeResult>
}
