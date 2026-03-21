import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import sampleQueue from "../queues/sampleQueue";
import submissionQueue from "../queues/submissionQueue";
import EvaluationQueue from "../queues/EvaluationQueue";

// create express adapter
const serverAdapter = new ExpressAdapter();

// base path for UI
serverAdapter.setBasePath("/admin/queues");

// connect bull-board with your queues
createBullBoard({
  queues: [
    new BullMQAdapter(sampleQueue),
    new BullMQAdapter(submissionQueue),
     new BullMQAdapter(EvaluationQueue),
  ],
  serverAdapter,
});

export { serverAdapter };
