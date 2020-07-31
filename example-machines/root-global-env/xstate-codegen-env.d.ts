/// <reference types="xstate" />
/// <reference types="@xstate/react/lib" />

import { StateNodeWithGeneratedTypes, EventObject } from 'xstate';
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

  interface UpdatePropertyOptions {
    services: {
      something?: any;
    };
    actions: {
      awesome: any;
    };
  }

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
}

declare module '@xstate/react' {
  export function useMachine<
    TContext,
    TSchema,
    TEvent extends EventObject,
    TMatches extends string,
    TOptions
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
    Omit<State<TContext, TEvent>, 'matches'> & {
      matches: (matches: TMatches) => boolean;
    },
    Interpreter<TContext, TSchema, TEvent>['send'],
    Interpreter<TContext, TSchema, TEvent>,
  ];
}
