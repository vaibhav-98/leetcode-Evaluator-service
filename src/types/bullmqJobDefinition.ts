import { Job } from "bullmq";

export interface IJob {
    name: string
    poyload?:  Record<string, unknown>
    handle: (job?: Job) => void
    failed: (job?: Job) => void
}