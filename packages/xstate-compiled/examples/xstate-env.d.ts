import { EventObject, MachineConfig } from 'xstate';
import {
  StateWithMatches,
  InterpreterWithMatches,
  RegisteredMachine,
} from '@xstate/compiled';
import { Interpreter } from 'xstate/lib/interpreter';
import { State } from 'xstate/lib/State';
import { StateNode } from 'xstate/lib/StateNode';

declare module '@xstate/compiled' {
  /** Types imported via the TS Compiler API */

  type LightMachineStateMatches =
    | 'green'
    | 'yellow'
    | 'red'
    | 'red.walk'
    | 'red.wait'
    | 'red.stop';

  interface LightMachineOptions<TContext, TEvent extends EventObject> {
    context?: Partial<TContext>;
    guards: {
      hasCompleted: (
        context: TContext,
        event: Extract<TEvent, { type: 'PED_COUNTDOWN' }>,
      ) => boolean;
    };
    devTools?: boolean;
  }

  export class LightMachineStateMachine<
    TContext,
    TStateSchema,
    TEvent extends EventObject,
    Id extends 'lightMachine'
  > extends StateNodeWithGeneratedTypes<TContext, TStateSchema, TEvent> {
    id: Id;
    states: StateNode<TContext, TStateSchema, TEvent>['states'];
    _matches: LightMachineStateMatches;
    _options: LightMachineOptions<TContext, TEvent>;
  }

  type FaceMachineStateMatches =
    | 'eyes'
    | 'eyes.open'
    | 'eyes.closed'
    | 'mouth'
    | 'mouth.open'
    | 'mouth.closed';

  interface FaceMachineOptions<TContext, TEvent extends EventObject> {
    context?: Partial<TContext>;
    guards: {
      hasClosed: (
        context: TContext,
        event: Extract<TEvent, { type: 'PED_COUNTDOWN' }>,
      ) => boolean;
    };
    devTools?: boolean;
  }

  export class FaceMachineStateMachine<
    TContext,
    TStateSchema,
    TEvent extends EventObject,
    Id extends 'faceMachine'
  > extends StateNodeWithGeneratedTypes<TContext, TStateSchema, TEvent> {
    id: Id;
    states: StateNode<TContext, TStateSchema, TEvent>['states'];
    _options: FaceMachineOptions<TContext, TEvent>;
    _matches: FaceMachineStateMatches;
  }

  /** Utility types */

  export class StateNodeWithGeneratedTypes<
    TContext,
    TSchema,
    TEvent extends EventObject
  > extends StateNode<TContext, TSchema, TEvent> {}

  export type InterpreterWithMatches<
    TContext,
    TSchema,
    TEvent extends EventObject,
    Id extends string
  > = Omit<Interpreter<TContext, TSchema, TEvent>, 'state'> & {
    state: StateWithMatches<
      TContext,
      TEvent,
      Extract<
        RegisteredMachine<TContext, TSchema, TEvent>,
        {
          id: Id;
        }
      >['_matches']
    >;
  };

  export type StateWithMatches<
    TContext,
    TEvent extends EventObject,
    TMatches
  > = Omit<State<TContext, TEvent>, 'matches'> & {
    matches: (matches: TMatches) => boolean;
  };

  /**
   * Interpret function for compiled state machines
   */
  export function interpret<
    TContext,
    TSchema,
    TEvent extends EventObject,
    Id extends string
  >(
    machine: Extract<RegisteredMachine<TContext, TSchema, TEvent>, { id: Id }>,
    options: Extract<
      RegisteredMachine<TContext, TSchema, TEvent>,
      { id: Id }
    >['_options'],
  ): InterpreterWithMatches<TContext, TSchema, TEvent, Id>;

  export interface RegisteredMachinesMap<
    TContext,
    TStateSchema,
    TEvent extends EventObject
  > {
    lightMachine: LightMachineStateMachine<
      TContext,
      TStateSchema,
      TEvent,
      'lightMachine'
    >;
    faceMachine: FaceMachineStateMachine<
      TContext,
      TStateSchema,
      TEvent,
      'faceMachine'
    >;
  }

  export type RegisteredMachine<
    TContext,
    TStateSchema,
    TEvent extends EventObject
  > = RegisteredMachinesMap<
    TContext,
    TStateSchema,
    TEvent
  >[keyof RegisteredMachinesMap<TContext, TStateSchema, TEvent>];

  export function Machine<
    TContext,
    TStateSchema,
    TEvent extends EventObject,
    Id extends keyof RegisteredMachinesMap<TContext, TStateSchema, TEvent>
  >(
    config: MachineConfig<TContext, TStateSchema, TEvent>,
  ): RegisteredMachinesMap<TContext, TStateSchema, TEvent>[Id];

  export function Machine<
    TContext,
    TEvent extends EventObject,
    Id extends keyof RegisteredMachinesMap<TContext, any, TEvent>
  >(
    config: MachineConfig<TContext, any, TEvent>,
  ): RegisteredMachinesMap<TContext, any, TEvent>[Id];
}

declare module '@xstate/compiled/react' {
  export function useMachine<
    TContext,
    TSchema,
    TEvent extends EventObject,
    Id extends string
  >(
    machine: Extract<RegisteredMachine<TContext, TSchema, TEvent>, { id: Id }>,
    options: Extract<
      RegisteredMachine<TContext, TSchema, TEvent>,
      { id: Id }
    >['_options'],
  ): [
    StateWithMatches<
      TContext,
      TEvent,
      Extract<
        RegisteredMachine<TContext, TSchema, TEvent>,
        { id: Id }
      >['_matches']
    >,
    InterpreterWithMatches<TContext, TSchema, TEvent, Id>['send'],
    InterpreterWithMatches<TContext, TSchema, TEvent, Id>,
  ];
}
