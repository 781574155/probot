import { Webhooks } from "@octokit/webhooks";
import type { Logger } from "pino";

import type { ProbotOctokit } from "./probot-octokit.js";
import type { ProbotWebhooks } from "../types.js";

import { getErrorHandler } from "../helpers/get-error-handler.js";
import { webhookTransform } from "./octokit-webhooks-transform.js";

type GetWebhooksOptions = {
  log: Logger;
  octokit: ProbotOctokit;
  webhookSecret: string;
  skipVerification?: boolean;
};

export function getWebhooks(options: GetWebhooksOptions): ProbotWebhooks {
  const webhooks = new Webhooks({
    log: options.log,
    secret: options.webhookSecret,
    transform: (event) => webhookTransform(options, event),
  });

  // If skipVerification is enabled, override verifyAndReceive to skip signature verification
  if (options.skipVerification) {
    webhooks.verifyAndReceive = async (event) => {
      // Parse the payload and directly call receive without verification
      let payload;
      try {
        payload = JSON.parse(event.payload);
      } catch (error) {
        (error as any).message = "Invalid JSON";
        (error as any).status = 400;
        throw new AggregateError([error], (error as any).message);
      }
      return webhooks.receive({
        id: event.id,
        name: event.name as any,
        payload,
      });
    };
  }

  webhooks.onError(getErrorHandler(options.log));
  return webhooks;
}
