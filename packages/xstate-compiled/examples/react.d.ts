import {
  EventObject,
} from 'xstate';
import {
  StateWithMatches,
  InterpreterWithMatches,
  RegisteredMachine,
} from '@xstate/compiled';

declare module '@xstate/compiled/react' {
  export function useMachine<
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
  ): [
    StateWithMatches<
      TContext,
      TEvent,
      Extract<RegisteredMachine<TContext, TEvent>, { id: Id }>['_matches']
    >,
    InterpreterWithMatches<TContext, TSchema, TEvent, Id>['send'],
    InterpreterWithMatches<TContext, TSchema, TEvent, Id>,
  ];
}