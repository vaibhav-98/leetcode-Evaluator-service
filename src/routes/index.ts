import express from "express"
import v1Route from "./v1"

const apiRouter = express.Router()

apiRouter.use("/v1", v1Route)

export default apiRouter