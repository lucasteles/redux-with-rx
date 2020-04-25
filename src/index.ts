import { createStore, combineReducers, Store, AnyAction, Action } from 'redux'
import { Subject, Observable } from 'rxjs'
import { finalize, share, tap, map, mergeMap, distinctUntilChanged } from 'rxjs/operators'

function CreateObsevableStore<State, A extends Action = AnyAction>(store: Store<State, A>): Observable<State> {
  const subject = new Subject<State>()
  const reduxUnsubscribe = store.subscribe(() => subject.next(store.getState()))
  const shared = subject.pipe(
    finalize(() => reduxUnsubscribe()),
    share()
  )

  return shared
}

function CreateDispatchOperator<State, A extends Action = AnyAction>(store: Store<State, A>) {
  const dispatch = () => (observable$: Observable<A>) => observable$.pipe(
    tap(value => store.dispatch(value)),
  )
  return dispatch
}


export interface Message {
  user: string
  message: string
  timestamp: number
}

export interface ChatState {
  messages: Message[]
}


export const SEND_MESSAGE = 'SEND_MESSAGE'
export const DELETE_MESSAGE = 'DELETE_MESSAGE'

interface SendMessageAction {
  type: typeof SEND_MESSAGE
  payload: Message
}

interface DeleteMessageAction {
  type: typeof DELETE_MESSAGE
  meta: {
    timestamp: number
  }
}

export type ChatActionTypes = SendMessageAction | DeleteMessageAction


export function sendMessage(newMessage: Message): ChatActionTypes {
  return {
    type: SEND_MESSAGE,
    payload: newMessage
  }
}

export function deleteMessage(timestamp: number): ChatActionTypes {
  return {
    type: DELETE_MESSAGE,
    meta: {
      timestamp
    }
  }
}


const initialState: ChatState = {
  messages: []
}

export function chatReducer(
  state = initialState,
  action: ChatActionTypes
): ChatState {
  switch (action.type) {
    case SEND_MESSAGE:
      return {
        messages: [...state.messages, action.payload]
      }
    case DELETE_MESSAGE:
      return {
        messages: state.messages.filter(
          message => message.timestamp !== action.meta.timestamp
        )
      }
    default:
      return state
  }
}

const rootReducer = combineReducers({
  chat: chatReducer
})

const store = createStore(rootReducer)

const state$ = CreateObsevableStore(store)
const dispatch = CreateDispatchOperator(store)

state$.pipe(
  mergeMap(x => x.chat.messages),
  distinctUntilChanged(),
).subscribe(console.log)

const messages = new Subject<string>()
messages.pipe(
  map(m => sendMessage({ message : m, timestamp: m.length, user: ""})),
  dispatch()
).subscribe()

messages.next("Teles")
messages.next("Ana")