import express from "express";

import { addSubmission } from "../../controllers/submissionController";
import { createSubmissionZodSchems } from "../../dtos/createSubmissionDto"
import { validate } from "../../validators/zodValidator";


const submissionRouter = express.Router();

submissionRouter.post(
    '/', 
    validate(createSubmissionZodSchems),
    addSubmission);

export default submissionRouter;


