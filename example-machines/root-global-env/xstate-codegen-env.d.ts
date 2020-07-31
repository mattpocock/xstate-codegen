/// <reference types="xstate" />

import {
  StateNodeWithGeneratedTypes,
  EventObject,
  MachineOptions,
  StateWithMatches,
  InterpreterWithMatches,
} from 'xstate';
import { Interpreter } from 'xstate/lib/interpreter';
import { State } from 'xstate/lib/State';
import { StateNode } from 'xstate/lib/StateNode';

declare module 'xstate' {
  /** Types imported via the TS Compiler API */
  interface UpdatePropertyContext {
    imageId?: string;
    isDeletingImage: boolean;
  }

  export type UpdateMode = 'hasNewPhoto' | 'isDeletingPhoto' | 'samePhoto';

  type UpdatePropertyUpdateMode =
    | 'hasNewPhoto'
    | 'isDeletingPhoto'
    | 'samePhoto';

  type UpdatePropertyEvent = {
    type: 'UPDATE';
    mode: UpdateMode;
  };

  type UpdatePropertyMatches = 'idle' | 'addingImage';

  interface UpdatePropertyOptions {
    services: {
      something: any;
    };
    actions: {
      awesome: any;
    };
  }

  /** Utility types */

  export class StateNodeWithGeneratedTypes<
    TContext,
    TSchema,
    TEvent extends EventObject,
    TMatches,
    TOptions
  > extends StateNode<TContext, TSchema, TEvent> {
    /**
     * A little hack to make sure that the TMatches and TOptions are stored
     * somewhere - there could be a better way of doing this
     */
    _options?: TOptions;
    _matches?: TMatches;
  }

  export type InterpreterWithMatches<
    TContext,
    TSchema,
    TEvent extends EventObject,
    TMatches
  > = Omit<Interpreter<TContext, TSchema, TEvent>, 'state'> & {
    state: StateWithMatches<TContext, TEvent, TMatches>;
  };

  export type StateWithMatches<
    TContext,
    TEvent extends EventObject,
    TMatches
  > = Omit<State<TContext, TEvent>, 'matches'> & {
    matches: (matches: TMatches) => boolean;
  };

  export class UpdatePropertyStateMachine extends StateNodeWithGeneratedTypes<
    UpdatePropertyContext,
    any,
    UpdatePropertyEvent,
    UpdatePropertyMatches,
    UpdatePropertyOptions
  > {
    id: string;
    states: StateNode<
      UpdatePropertyContext,
      any,
      UpdatePropertyEvent
    >['states'];
  }

  /**
   * Dummy interpret function
   */

  export function interpretCompiled<
    TContext,
    TSchema,
    TEvent extends EventObject,
    TMatches,
    TOptions = MachineOptions<TContext, TEvent>
  >(
    machine: StateNodeWithGeneratedTypes<
      TContext,
      TSchema,
      TEvent,
      TMatches,
      TOptions
    >,
    options: TOptions,
  ): InterpreterWithMatches<TContext, TSchema, TEvent, TMatches>;
}

declare module '@xstate/react' {
  export function useCompiledMachine<
    TContext,
    TSchema,
    TEvent extends EventObject,
    TMatches extends string,
    TOptions = MachineOptions<TContext, TEvent>
  >(
    machine: StateNodeWithGeneratedTypes<
      TContext,
      TSchema,
      TEvent,
      TMatches,
      TOptions
    >,
    options: { [K in keyof TOptions]-?: Required<TOptions[K]> },
  ): [
    StateWithMatches<TContext, TEvent, TMatches>,
    InterpreterWithMatches<TContext, TSchema, TEvent, TMatches>['send'],
    InterpreterWithMatches<TContext, TSchema, TEvent, TMatches>,
  ];
}
