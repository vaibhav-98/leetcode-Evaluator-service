import { TestCases } from "./testCases";

export type SubmissionPayload = {
    code: string,
    language: string,
    inputCase?: string,
    outputCase?: string,
    testCases: TestCases,
    userId: string,
    submissionId: string
}