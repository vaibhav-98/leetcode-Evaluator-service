import { TestCases } from "./testCases";

export default interface CodeExecutorStrategy {
    execute(code: string, testCases: TestCases) : Promise<ExecutionResponse>;
};

export type ExecutionResponse = {output:string, status: string};