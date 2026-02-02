import { Job,Worker } from "bullmq";

import redisConnection from "../config/redisConfig";
// import redisConnection from '../config/redisConfig';
import SampleJob from "../jobs/sample.Job";

export default function SampleWorker(queueName: string) {
    // console.log("Setup the connection for redis", redisConnection);
    
    new Worker(
        queueName,
        async (job: Job) => {
            //console.log("Sample job worker kicking ", job); // 2
            
            if(job.name == "SampleJob"){
                const sampleJobInstance = new SampleJob(job.data);

                sampleJobInstance.handle(job);
            }
        },
        {
            connection: redisConnection
        }
    );
}

















