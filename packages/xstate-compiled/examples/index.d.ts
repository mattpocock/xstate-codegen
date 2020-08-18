import {
  EventObject,
  SingleOrArray,
  InvokeConfig,
  StateMachine,
  Actions,
  DoneEventObject,
  DelayedTransitions,
  Activity,
  Mapper,
  PropertyMapper,
  Condition,
  StateValue,
  ActionObject,
  ActionFunction,
  ActivityConfig,
  DoneInvokeEvent,
  ErrorPlatformEvent,
  InvokeCreator,
  assign,
  send,
  Expr,
} from 'xstate';
import {
  StateWithMatches,
  InterpreterWithMatches,
  RegisteredMachine,
} from '@xstate/compiled';
import { Interpreter } from 'xstate/lib/interpreter';
import { State } from 'xstate/lib/State';
import { StateNode } from 'xstate/lib/StateNode';


declare module '@xstate/compiled' {
  /** Generated Types */
  export class FetchMachineStateMachine<
    TContext,
    TEvent extends EventObject,
    Id extends 'fetchMachine'
  > extends StateNodeWithGeneratedTypes<TContext, any, TEvent> {
    id: Id;
    states: StateNode<TContext, any, TEvent>['states'];
    _matches:
      | 'idle'
      | 'pending'
      | 'success'
    _options: {
      context?: Partial<TContext>;
      actions: {
        celebrate:
          | ActionObject<
              TContext,
              Extract<TEvent,
              | { type: 'done.invoke.makeFetch' }
              > extends undefined ? TEvent : Extract<TEvent,
              | { type: 'done.invoke.makeFetch' }
              >
            >
          | ActionFunction<
              TContext,
              Extract<TEvent,
              | { type: 'done.invoke.makeFetch' }
              > extends undefined ? TEvent : Extract<TEvent,
              | { type: 'done.invoke.makeFetch' }
              >
            >;
      };
      services: {
        makeFetch: InvokeCreator<
          TContext, 
          Extract<TEvent,
          | { type: 'MAKE_FETCH' }
          >
,
          Extract<
            TEvent,
            { type: 'done.invoke.makeFetch'}> extends { 'data': infer T } ? T : any
          > | StateMachine<any, any, any>
      };
      devTools?: boolean;
    };
    _subState: {
    targets: '.idle' | '.pending' | '.success';
    sources: never;
    states: {
      idle: {
    targets: 'idle' | 'pending' | 'success';
    sources: never;
    states: {
      
    };
  }
pending: {
    targets: 'idle' | 'pending' | 'success';
    sources: 'MAKE_FETCH';
    states: {
      
    };
  }
success: {
    targets: 'idle' | 'pending' | 'success';
    sources: 'done.invoke.makeFetch';
    states: {
      
    };
  }
    };
  };
  }
  export class FaceMachineStateMachine<
    TContext,
    TEvent extends EventObject,
    Id extends 'faceMachine'
  > extends StateNodeWithGeneratedTypes<TContext, any, TEvent> {
    id: Id;
    states: StateNode<TContext, any, TEvent>['states'];
    _matches:
      | 'eyes'
      | 'eyes.open'
      | 'eyes.middle'
      | 'eyes.middle.closing'
      | 'eyes.middle.somethingCool'
      | 'eyes.closed'
      | 'eyes.closed.dreaming'
      | 'eyes.closed.awakeButPretending'
      | 'mouth'
      | 'mouth.open'
      | 'mouthClosed'
    _options: {
      context?: Partial<TContext>;
      guards: {
        checkingIfCanGoCool: (
          context: TContext,
          event:
            Extract<TEvent,
            | { type: 'xstate.after(8000)#(machine).eyes.middle' }
            >
          ) => boolean;
      };
      devTools?: boolean;
    };
    _subState: {
    targets: '.eyes' | '.mouth';
    sources: never;
    states: {
      eyes: {
    targets: '.open' | '.middle' | '.closed' | 'eyes' | 'mouth';
    sources: never;
    states: {
      open: {
    targets: 'open' | 'middle' | 'closed';
    sources: 'OPEN_EYES';
    states: {
      
    };
  }
middle: {
    targets: '.closing' | '.somethingCool' | 'open' | 'middle' | 'closed';
    sources: never;
    states: {
      closing: {
    targets: 'closing' | 'somethingCool';
    sources: never;
    states: {
      
    };
  }
somethingCool: {
    targets: 'closing' | 'somethingCool';
    sources: 'xstate.after(8000)#(machine).eyes.middle';
    states: {
      
    };
  }
    };
  }
closed: {
    targets: '.dreaming' | '.awakeButPretending' | 'open' | 'middle' | 'closed';
    sources: 'CLOSE_EYES';
    states: {
      dreaming: {
    targets: 'dreaming' | 'awakeButPretending';
    sources: 'FALL_ASLEEP';
    states: {
      
    };
  }
awakeButPretending: {
    targets: 'dreaming' | 'awakeButPretending';
    sources: never;
    states: {
      
    };
  }
    };
  }
    };
  }
mouth: {
    targets: '.open' | '.closed' | 'eyes' | 'mouth';
    sources: never;
    states: {
      open: {
    targets: 'open' | 'closed';
    sources: 'OPEN_MOUTH';
    states: {
      
    };
  }
closed: {
    targets: 'open' | 'closed';
    sources: 'OPEN_MOUTH';
    states: {
      
    };
  }
    };
  }
    };
  };
  }
  export class LightMachineStateMachine<
    TContext,
    TEvent extends EventObject,
    Id extends 'lightMachine'
  > extends StateNodeWithGeneratedTypes<TContext, any, TEvent> {
    id: Id;
    states: StateNode<TContext, any, TEvent>['states'];
    _matches:
      | 'green'
      | 'yellow'
      | 'red'
      | 'red.walk'
      | 'red.wait'
      | 'red.stop'
    _options: {
      context?: Partial<TContext>;
      guards: {
        isSuperCool: (
          context: TContext,
          event:
            Extract<TEvent,
            | { type: 'PED_COUNTDOWN' }
            >
          ) => boolean;
      };
      devTools?: boolean;
    };
    _subState: {
    targets: '.green' | '.yellow' | '.red';
    sources: never;
    states: {
      green: {
    targets: 'green' | 'yellow' | 'red';
    sources: 'TIMER';
    states: {
      
    };
  }
yellow: {
    targets: 'green' | 'yellow' | 'red';
    sources: 'TIMER';
    states: {
      
    };
  }
red: {
    targets: '.walk' | '.wait' | '.stop' | 'green' | 'yellow' | 'red';
    sources: 'POWER_OUTAGE' | 'TIMER' | 'PED_COUNTDOWN';
    states: {
      walk: {
    targets: 'walk' | 'wait' | 'stop';
    sources: never;
    states: {
      
    };
  }
wait: {
    targets: 'walk' | 'wait' | 'stop';
    sources: 'PED_COUNTDOWN';
    states: {
      
    };
  }
stop: {
    targets: 'walk' | 'wait' | 'stop';
    sources: 'POWER_OUTAGE';
    states: {
      
    };
  }
    };
  }
    };
  };
  }

  export interface RegisteredMachinesMap<TContext, TEvent extends EventObject> {
    fetchMachine: FetchMachineStateMachine<TContext, TEvent, 'fetchMachine'>
    faceMachine: FaceMachineStateMachine<TContext, TEvent, 'faceMachine'>
    lightMachine: LightMachineStateMachine<TContext, TEvent, 'lightMachine'>
  }

  /** Utility types */

  export type InvokeConfig<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > = {
    /**
     * The unique identifier for the invoked machine. If not specified, this
     * will be the machine's own `id`, or the URL (from `src`).
     */
    id?: string;
    /**
     * The source of the machine to be invoked, or the machine itself.
     */
    src:
      | string
      | StateMachine<any, any, any>
      | InvokeCreator<TContext, TEvent, any>;
    /**
     * If `true`, events sent to the parent service will be forwarded to the invoked service.
     *
     * Default: `false`
     */
    autoForward?: boolean;
    /**
     * @deprecated
     *
     *  Use `autoForward` property instead of `forward`. Support for `forward` will get removed in the future.
     */
    forward?: boolean;
    /**
     * Data from the parent machine's context to set as the (partial or full) context
     * for the invoked child machine.
     *
     * Data should be mapped to match the child machine's context shape.
     */
    data?:
      | Mapper<TContext, TEvent, any>
      | PropertyMapper<TContext, TEvent, any>;
    /**
     * The transition to take upon the invoked child machine reaching its final top-level state.
     */
    onDone?:
      | TSubState['targets']
      | SingleOrArray<TransitionConfig<TContext, TEvent | DoneEventObject, TSubState>>;
    /**
     * The transition to take upon the invoked child machine sending an error event.
     */
    onError?:
      | TSubState['targets']
      | SingleOrArray<TransitionConfig<TContext, TEvent | ErrorPlatformEvent, TSubState>>;
  };

  export type RegisteredMachine<
    TContext,
    TEvent extends EventObject
  > = RegisteredMachinesMap<TContext, TEvent>[keyof RegisteredMachinesMap<
    TContext,
    TEvent
  >];

  export class StateNodeWithGeneratedTypes<
    TContext,
    TSchema,
    TEvent extends EventObject
  > extends StateNode<TContext, TSchema, TEvent> {}

  export type DelayedTransitions<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > =
    | Record<
        string | number,
        | TSubState['targets']
        | SingleOrArray<TransitionConfig<TContext, TEvent, TSubState>>
      >
    | Array<
        TransitionConfig<TContext, TEvent, TSubState> & {
          delay: number | string | Expr<TContext, TEvent, number>;
        }
      >;

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
        RegisteredMachine<TContext, TEvent>,
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

  export function interpret<
    TContext,
    TSchema,
    TEvent extends EventObject,
    Id extends string
  >(
    machine: Extract<RegisteredMachine<TContext, TEvent>, { id: Id }>,
    options: Extract<
      RegisteredMachine<TContext, TEvent>,
      { id: Id }
    >['_options'],
  ): InterpreterWithMatches<TContext, TSchema, TEvent, Id>;

  export function Machine<
    TContext,
    TEvent extends EventObject,
    Id extends keyof RegisteredMachinesMap<TContext, TEvent>
  >(
    config: MachineConfig<
      TContext,
      TEvent,
      RegisteredMachinesMap<TContext, TEvent>[Id]['_subState']
    >,
  ): RegisteredMachinesMap<TContext, TEvent>[Id];

  export function createMachine<
    TContext,
    TEvent extends EventObject,
    Id extends keyof RegisteredMachinesMap<TContext, TEvent>
  >(
    config: MachineConfig<
      TContext,
      TEvent,
      RegisteredMachinesMap<TContext, TEvent>[Id]['_subState']
    >,
  ): RegisteredMachinesMap<TContext, TEvent>[Id];

  export interface MachineConfig<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > extends StateNodeConfig<TContext, TEvent, TSubState> {
    /**
     * The initial context (extended state)
     */
    context?: TContext | (() => TContext);
    /**
     * The machine's own version.
     */
    version?: string;
  }

  export interface SubState {
    targets: string;
    sources: string;
    states: Record<string, SubState>;
  }

  export type TransitionConfigTarget<TSubState extends SubState> =
    | TSubState['targets']
    | undefined;

  export type TransitionTarget<TSubState extends SubState> = SingleOrArray<
    TSubState['targets']
  >;

  export interface TransitionConfig<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > {
    cond?: Condition<TContext, TEvent>;
    actions?: Actions<TContext, TEvent>;
    in?: StateValue;
    internal?: boolean;
    target?: TransitionTarget<TSubState>;
    meta?: Record<string, any>;
  }

  export type TransitionConfigOrTarget<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > = SingleOrArray<
    | TransitionConfigTarget<TSubState>
    | TransitionConfig<TContext, TEvent, TSubState>
  >;

  export type TransitionsConfigMap<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > = {
    [K in TEvent['type']]?: TransitionConfigOrTarget<
      TContext,
      TEvent extends {
        type: K;
      }
        ? TEvent
        : never,
      TSubState
    >;
  } & {
    ''?: TransitionConfigOrTarget<TContext, TEvent, TSubState>;
  } & {
    '*'?: TransitionConfigOrTarget<TContext, TEvent, TSubState>;
  };

  export type TransitionsConfigArray<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > = Array<TransitionsConfigMap<TContext, TEvent, TSubState>>;

  export type TransitionsConfig<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > =
    | TransitionsConfigMap<TContext, TEvent, TSubState>
    | TransitionsConfigArray<TContext, TEvent, TSubState>;

  export interface StateNodeConfig<
    TContext,
    TEvent extends EventObject,
    TSubState extends SubState
  > {
    /**
     * The relative key of the state node, which represents its location in the overall state value.
     * This is automatically determined by the configuration shape via the key where it was defined.
     */
    key?: string;
    /**
     * The initial state node key.
     */
    initial?: keyof TSubState['states'];
    /**
     * @deprecated
     */
    parallel?: boolean | undefined;
    /**
     * The type of this state node:
     *
     *  - `'atomic'` - no child state nodes
     *  - `'compound'` - nested child state nodes (XOR)
     *  - `'parallel'` - orthogonal nested child state nodes (AND)
     *  - `'history'` - history state node
     *  - `'final'` - final state node
     */
    type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
    /**
     * The initial context (extended state) of the machine.
     *
     * Can be an object or a function that returns an object.
     */
    context?: TContext | (() => TContext);
    /**
     * Indicates whether the state node is a history state node, and what
     * type of history:
     * shallow, deep, true (shallow), false (none), undefined (none)
     */
    history?: 'shallow' | 'deep' | boolean | undefined;
    /**
     * The mapping of state node keys to their state node configurations (recursive).
     */
    states?: {
      [K in keyof TSubState['states']]: StateNodeConfig<
        TContext,
        TEvent,
        TSubState['states'][K]
      >;
    };
    /**
     * The services to invoke upon entering this state node. These services will be stopped upon exiting this state node.
     */
    invoke?: SingleOrArray<
      | InvokeConfig<
          TContext,
          TEvent,
          TSubState
        >
      | StateMachine<any, any, any>
    >;
    /**
     * The mapping of event types to their potential transition(s).
     */
    on?: TransitionsConfig<TContext, TEvent, TSubState>;
    /**
     * The action(s) to be executed upon entering the state node.
     *
     * @deprecated Use `entry` instead.
     */
    onEntry?: Actions<
      TContext,
      Extract<TEvent, { type: TSubState['sources'] }>
    >;
    /**
     * The action(s) to be executed upon entering the state node.
     */
    entry?: Actions<TContext, Extract<TEvent, { type: TSubState['sources'] }>>;
    /**
     * The action(s) to be executed upon exiting the state node.
     *
     * @deprecated Use `exit` instead.
     */
    onExit?: Actions<TContext, TEvent>;
    /**
     * The action(s) to be executed upon exiting the state node.
     */
    exit?: Actions<TContext, TEvent>;
    /**
     * The potential transition(s) to be taken upon reaching a final child state node.
     *
     * This is equivalent to defining a `[done(id)]` transition on this state node's `on` property.
     */
    onDone?:
      | TSubState['targets']
      | SingleOrArray<TransitionConfig<TContext, DoneEventObject, TSubState>>;
    /**
     * The mapping (or array) of delays (in milliseconds) to their potential transition(s).
     * The delayed transitions are taken after the specified delay in an interpreter.
     */
    after?: DelayedTransitions<TContext, TEvent, TSubState>;
    /**
     * An eventless transition that is always taken when this state node is active.
     * Equivalent to a transition specified as an empty `''`' string in the `on` property.
     */
    always?: TransitionConfigOrTarget<
      TContext,
      Extract<TEvent, { type: TSubState['sources'] }>,
      TSubState
    >;
    /**
     * The activities to be started upon entering the state node,
     * and stopped upon exiting the state node.
     */
    activities?: SingleOrArray<
      Activity<TContext, Extract<TEvent, { type: TSubState['sources'] }>>
    >;
    /**
     * @private
     */
    parent?: StateNode<TContext, any, TEvent>;
    strict?: boolean | undefined;
    /**
     * The meta data associated with this state node, which will be returned in State instances.
     */
    meta?: any;
    /**
     * The data sent with the "done.state._id_" event if this is a final state node.
     *
     * The data will be evaluated with the current `context` and placed on the `.data` property
     * of the event.
     */
    data?:
      | Mapper<TContext, TEvent, any>
      | PropertyMapper<TContext, TEvent, any>;
    /**
     * The unique ID of the state node, which can be referenced as a transition target via the
     * `#id` syntax.
     */
    id?: string | undefined;
    /**
     * The string delimiter for serializing the path to a string. The default is "."
     */
    delimiter?: string;
    /**
     * The order this state node appears. Corresponds to the implicit SCXML document order.
     */
    order?: number;
  }

  
}