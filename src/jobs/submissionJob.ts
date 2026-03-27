import { Job } from "bullmq";

import { IJob } from "../types/bullmqJobDefinition";
import { ExecutionResponse } from "../types/codeExecutorStrategy";
import { SubmissionPayload } from "../types/submissionPayload";
import createExecutor from "../utils/ExecutorFactory";
import evaluationQueueProducer from "../producers/evaluationQueueProducer";

export default class SubmissionJob implements IJob {
    name: string;
    payload: Record<string, SubmissionPayload>;
    constructor(payload: Record<string, SubmissionPayload>) {
        this.payload = payload;
        this.name = this.constructor.name;
    }

    handle = async (job?: Job) => {
        console.log("Handler of the job called");
        console.log(this.payload);
        if (job) {
            for (const key of Object.keys(this.payload)) {
                const submission = this.payload[key];
                const codeLanguage = submission.language;
                const code = submission.code;
                const strategy = createExecutor(codeLanguage);

                if (strategy != null) {
                    const testCases = submission.testCases || ((submission.inputCase && submission.outputCase) ? [{ input: submission.inputCase, output: submission.outputCase }] : []);

                    if (testCases.length === 0) {
                        console.error(`No test cases found for submission ${submission.submissionId}`);
                        continue;
                    }

                    // Execute all test cases together for efficiency
                    const response: ExecutionResponse = await strategy.execute(code, testCases);

                    await evaluationQueueProducer({
                        response,
                        userId: submission.userId,
                        submissionId: submission.submissionId
                    });

                    if (response.status === "SUCCESS") {
                        console.log("✅ Accepted");
                    } else if (response.status === "WA") {
                        console.log("❌ Wrong Answer");
                    } else if (response.status === "CE") {
                        console.log("❌ Compilation Error");
                    } else if (response.status === "ERROR") {
                        console.log("⚠️ Execution Error");
                    }
                }
            }
        }
    };

    failed = (job?: Job): void => {
        console.log("Job failed");
        if (job) {
            console.log(job.id);
        }
    };
}