import {setupWorker} from "msw/browser";
import {handlers} from "./handlers";
export async function startMockApi(){const worker=setupWorker(...handlers);await worker.start({onUnhandledFrame:"error"});return worker;}
