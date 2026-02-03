import express from "express"
import { pingCheck } from "../../controllers/pingController"
import submissionRouter from "./sumissionRoutes";


const v1Route = express.Router()

v1Route.use('/submissions', submissionRouter);

v1Route.get("/ping", pingCheck)

export default v1Route