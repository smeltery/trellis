import type { ExecutionEnvironmentDescriptor } from "@trellis/contracts";
import { Effect, ServiceMap } from "effect";

export interface ServerEnvironmentShape {
  readonly getDescriptor: Effect.Effect<ExecutionEnvironmentDescriptor>;
}

export class ServerEnvironment extends ServiceMap.Service<
  ServerEnvironment,
  ServerEnvironmentShape
>()("trellis/environment/Services/ServerEnvironment") {}
