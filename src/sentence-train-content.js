import { TEXTBOOK_QUESTIONS } from './curriculum.js'
import { DEFAULT_QUESTIONS } from './data.js'
import { OTHER_TRAIN_SEGMENTATIONS } from './sentence-train-other-content.js'

function train(questionId, sentence, tokens, alternatives = []) {
  return {
    questionId,
    sentence,
    train: {
      tokens,
      punctuation: sentence.at(-1),
      alternatives,
    },
  }
}

// Teacher-aid examples linked to their exact built-in question and sentence.
// The segmentations are intentionally explicit: runtime code never guesses word boundaries.
function appendCuratedRecords(records, questionIds, questions, segmentations) {
  for (const question of questions) {
    if (questionIds.has(question.id)) continue
    const definition = segmentations[question.sentence]
    if (!definition) continue
    records.push(train(
      question.id,
      question.sentence,
      [...definition.tokens],
      definition.alternatives.map((alternative) => [...alternative]),
    ))
    questionIds.add(question.id)
  }
}

const expandedContent = []
const questionIds = new Set()
appendCuratedRecords(expandedContent, questionIds, TEXTBOOK_QUESTIONS, OTHER_TRAIN_SEGMENTATIONS)
appendCuratedRecords(expandedContent, questionIds, DEFAULT_QUESTIONS, OTHER_TRAIN_SEGMENTATIONS)

export const SENTENCE_TRAIN_CONTENT = expandedContent
