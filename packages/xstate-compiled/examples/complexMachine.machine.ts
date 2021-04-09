import {
  assign,
  createMachine,
  send,
  StateWithMatches,
} from '@xstate/compiled';

type GetDemoMatterportViewingSubscription = {};

export const complexMachineMachine = createMachine<
  ComplexMachineContext,
  ComplexMachineEvent,
  'complexMachine'
>({
  id: 'complexMachine',
  initial: 'awaitingPermissions',
  context: {
    audioInputDevices: [],
    audioOutputDevices: [],
    videoInputDevices: [],
    isJoiningMuted: false,
  },
  states: {
    awaitingPermissions: {
      initial: 'makingInitialCheck',
      on: {
        REPORT_NO_PERMISSION_TO_VIEW: 'youDoNotHavePermissionToViewThisPage',
      },
      states: {
        makingInitialCheck: {
          always: [
            {
              cond: 'checkIfUserIsTryingToAccessViaPin',
              target: 'isTryingToAccessViaPin',
            },
            {
              cond: 'isLoggedInAsAUser',
              target: 'isLoggedInAsAUser',
            },
            {
              target: 'errored',
            },
          ],
        },
        errored: {
          entry: send('REPORT_NO_PERMISSION_TO_VIEW'),
        },
        isLoggedInAsAUser: {
          entry: 'startDataStream',
          on: {
            RECEIVE_DATA: [
              {
                cond: 'isNotTheHostOfTheViewing',
                target: 'errored',
              },
              { actions: 'assignDataToContext', target: 'complete' },
            ],
          },
        },
        isTryingToAccessViaPin: {
          initial: 'checkingForSessionIdInLocalStorage',
          states: {
            checkingForSessionIdInLocalStorage: {
              invoke: {
                src: 'checkForSessionId',
                onDone: [
                  {
                    actions: [
                      assign((context, event) => {
                        return {
                          anonymousSessionId: event.data,
                        };
                      }),
                    ],
                    cond: (context) => Boolean(context.anonymousSessionId),
                    target: 'checksComplete',
                  },
                  {
                    target: 'checkingUserPin',
                  },
                ],
              },
            },
            checkingUserPin: {
              invoke: {
                src: 'checkUserPin',
                onDone: {
                  target: 'checksComplete',
                  actions: [
                    'saveSessionIdToLocalStorage',
                    assign((context, event) => ({
                      anonymousSessionId: event.data,
                    })),
                  ],
                },
                onError: {
                  target: 'errored',
                },
              },
            },
            errored: {
              entry: send('REPORT_NO_PERMISSION_TO_VIEW'),
            },
            checksComplete: {
              type: 'final',
            },
          },
          onDone: 'awaitingFirstPacketOfData',
        },
        awaitingFirstPacketOfData: {
          entry: 'startDataStream',
          on: {
            RECEIVE_DATA: [
              {
                cond: 'dataHasErrored',
                target: 'errored',
              },
              {
                cond: 'isTheHostOfTheViewing',
                actions: ['clearAnonymousSessionId', 'assignDataToContext'],
                target: 'complete',
              },
              {
                cond: 'hasAccessToTheViewing',
                actions: 'assignDataToContext',
                target: 'complete',
              },
              {
                target: 'errored',
              },
            ],
          },
        },
        complete: {
          type: 'final',
        },
      },
      onDone: [
        {
          cond: 'hasNotLoggedInBefore',
          target: 'creatingUserViewing',
        },
        { target: 'processingData' },
      ],
    },
    processingData: {
      always: [
        {
          cond: 'hasNoAccessToTheViewing',
          target: 'youDoNotHavePermissionToViewThisPage',
        },
        {
          cond: 'viewingHasEnded',
          target: 'viewingHasEnded',
        },
        {
          cond: 'isHost',
          target: 'inViewing',
        },
        {
          cond: 'thereAreTooManyPeopleInTheViewing',
          target: 'waitingForSomeoneElseToLeave',
        },
        {
          cond: 'hostIsNotHere',
          actions: ['reportThatViewersAreWaiting'],
          target: 'inViewerWaitingArea',
        },
        {
          target: 'inViewerWaitingArea',
        },
      ],
    },
    creatingUserViewing: {
      invoke: {
        src: 'createUserViewing',
        onError: 'youDoNotHavePermissionToViewThisPage',
        onDone: 'processingData',
      },
    },
    waitingForSomeoneElseToLeave: {
      initial: 'waiting',
      onDone: 'inViewing',
      states: {
        waiting: {
          on: {
            RECEIVE_DATA: {
              cond: 'userThatIsWaitingCanJoin',
              target: 'canJoin',
            },
          },
        },
        canJoin: {
          on: {
            JOIN_VIEWING: 'joining',
          },
        },
        joining: {
          type: 'final',
        },
      },
    },
    inViewerWaitingArea: {
      initial: 'waiting',
      on: {
        RECEIVE_DATA: {
          actions: 'assignDataToContext',
        },
      },
      states: {
        waiting: {
          on: {
            REPORT_VIEWING_STARTED: 'meetingIsReady',
          },
        },
        meetingIsReady: {
          on: {
            JOIN_VIEWING: 'readyToJoin',
          },
        },
        readyToJoin: {
          type: 'final',
        },
      },
      onDone: 'inViewing',
    },
    youDoNotHavePermissionToViewThisPage: { type: 'final' },
    viewingHasEnded: {
      type: 'final',
    },
    askingHostViewingEndingOptions: {
      on: {
        SEND_FOLLOWUP_EMAIL_TO_ATTENDEES: {
          actions: [
            'goToScheduledViewingsPage',
            'reportShouldSendFollowupToAttendees',
            'showToastSayingFollowupEmailHasSent',
          ],
        },
        REFUSE_SEND_FOLLOWUP_EMAIL_TO_ATTENDEES: {
          actions: 'goToScheduledViewingsPage',
        },
      },
    },
    attendeeHasLeftViewing: {
      type: 'final',
    },
    inViewing: {
      type: 'parallel',
      activities: ['updateViewingWithMyPresence'],
      on: {
        RECEIVE_DATA: [
          {
            cond: 'hasTheViewingEnded',
            target: 'viewingHasEnded',
          },
          {
            actions: 'assignDataToContext',
          },
        ],
        END_CALL: [
          {
            cond: 'isHost',
            actions: ['endViewing', 'endCallInTwilio'],
            target: 'askingHostViewingEndingOptions',
          },
          {
            target: 'attendeeHasLeftViewing',
            actions: ['endCallInTwilio'],
          },
        ],
        GIVE_CONTROL_BACK_TO_HOST: {
          actions: 'giveControlToHost',
          cond: 'isNotHost',
        },
        GIVE_CONTROL_TO_VIEWER: {
          actions: 'giveControlToViewer',
          cond: 'isHost',
        },
        RETRIEVE_CONTROL_AS_HOST: {
          cond: 'isHost',
          actions: 'giveControlToHost',
        },
        REQUEST_CONTROL_AS_VIEWER: [
          {
            cond: 'isHost',
            actions: 'giveControlToHost',
          },
          {
            cond: 'isAnonymousViewer',
            actions: 'requestControlAsAnonymousViewer',
          },
          {
            cond: 'isLoggedInUser',
            actions: 'requestControlAsLoggedInUser',
          },
        ],
        SEND_MESSAGE: [
          {
            cond: 'isAnonymousViewer',
            actions: 'sendMessageAsAnonymousViewer',
          },
          {
            cond: 'isLoggedInUser',
            actions: 'sendMessageAsLoggedInUser',
          },
        ],
      },
      states: {
        changePropertyModal: {
          initial: 'closed',
          states: {
            open: {
              on: {
                CLOSE_PROPERTY_MODAL: 'closed',
                UPDATE_PROPERTY: [
                  {
                    cond: 'canUpdateTheProperty',
                    actions: 'updateViewingProperty',
                  },
                  {
                    actions: 'showToastThatUserIsNotAllowedToUpdateTheProperty',
                  },
                ],
              },
            },
            closed: {
              on: {
                OPEN_PROPERTY_MODAL: 'open',
              },
            },
          },
        },
        excessViewerWarning: {
          initial: 'hasNotWarned',
          states: {
            hasNotWarned: {
              on: {},
            },
            hasWarned: {},
          },
        },
        chatTabs: {
          initial: 'callTab',
          states: {
            chatTab: {
              on: {
                PRESS_CALL_TAB: 'callTab',
              },
            },
            callTab: {
              initial: 'noNotificationBadge',
              states: {
                noNotificationBadge: {
                  on: {
                    RECEIVE_NEW_MESSAGES: 'showNotificationBadge',
                  },
                },
                showNotificationBadge: {},
              },
              on: {
                PRESS_CHAT_TAB: 'chatTab',
              },
            },
          },
        },
        mobileChatTabs: {
          initial: 'noTabOpen',
          states: {
            noTabOpen: {
              initial: 'noNotificationBadge',
              id: 'mobileChatTabsNoTabOpen',
              on: {
                PRESS_CHAT_TAB: 'chatTabOpen',
              },
              states: {
                noNotificationBadge: {
                  on: {
                    RECEIVE_NEW_MESSAGES: 'showNotificationBadge',
                    PRESS_CALL_TAB:
                      '#mobileChatTabsCallTabOpen.noNotificationBadge',
                  },
                },
                showNotificationBadge: {
                  on: {
                    PRESS_CALL_TAB:
                      '#mobileChatTabsCallTabOpen.showNotificationBadge',
                  },
                },
              },
            },
            chatTabOpen: {
              on: {
                PRESS_CHAT_TAB: 'noTabOpen',
                PRESS_CALL_TAB: 'callTabOpen',
              },
            },
            callTabOpen: {
              initial: 'noNotificationBadge',
              id: 'mobileChatTabsCallTabOpen',
              on: {
                PRESS_CHAT_TAB: 'chatTabOpen',
              },
              states: {
                noNotificationBadge: {
                  on: {
                    RECEIVE_NEW_MESSAGES: 'showNotificationBadge',
                    PRESS_CALL_TAB:
                      '#mobileChatTabsNoTabOpen.noNotificationBadge',
                  },
                },
                showNotificationBadge: {
                  on: {
                    PRESS_CALL_TAB:
                      '#mobileChatTabsNoTabOpen.showNotificationBadge',
                  },
                },
              },
            },
          },
        },
        callStatus: {
          initial: 'requestingTwilioAudioOptions',
          states: {
            notInCall: {
              on: {
                JOIN_CALL: 'requestingTwilioAudioOptions',
              },
              entry: 'reportHasNotJoinedCall',
            },
            requestingTwilioAudioOptions: {
              invoke: {
                src: 'requestTwilioAudioOptions',
                onError: 'callErrored',
                onDone: [
                  {
                    target: 'showingInitialCallOptionsModal',
                    actions: 'assignOptionsToState',
                  },
                ],
              },
            },
            showingInitialCallOptionsModal: {
              on: {
                BEGIN_CALL: [
                  {
                    target: 'beginningCall',
                  },
                ],
                BEGIN_CALL_MUTED: [
                  {
                    target: 'beginningCall',
                    actions: assign((context) => {
                      return {
                        ...context,
                        isJoiningMuted: true,
                      };
                    }),
                  },
                ],
                CHOOSE_DEVICE: {
                  actions: 'assignDeviceToContext',
                },
                REFUSE_TO_JOIN_CALL: 'notInCall',
              },
            },
            beginningCall: {
              invoke: {
                src: 'joiningTwilioCall',
                onDone: {
                  target: 'inCall',
                },
                onError: 'callErrored',
              },
            },
            inCall: {
              type: 'parallel',
              entry: 'reportHasJoinedCall',
              states: {
                callOptionsModal: {
                  initial: 'closed',
                  states: {
                    closed: {
                      on: {
                        OPEN_CALL_OPTIONS_MODAL: 'open',
                      },
                    },
                    open: {
                      on: {
                        CLOSE_CALL_OPTIONS_MODAL: 'closed',
                        CHOOSE_DEVICE: {
                          actions: [
                            'assignDeviceToContext',
                            'tellTwilioThatIChoseANewDevice',
                          ],
                        },
                      },
                    },
                  },
                },
                video: {
                  initial: 'checking',
                  states: {
                    checking: {
                      always: [
                        {
                          cond: 'choseNoVideo',
                          target: 'noVideo',
                        },
                        {
                          cond: 'isHost',
                          target: 'video',
                        },
                        {
                          target: 'noVideo',
                        },
                      ],
                    },
                    noVideo: {
                      entry: ['reportHostIsNotSharingVideo'],
                      on: {
                        TURN_ON_VIDEO: {
                          cond: 'isHost',
                          target: 'showingVideoOptions',
                        },
                      },
                    },
                    showingVideoOptions: {
                      on: {
                        CHOOSE_DEVICE: {
                          actions: 'assignDeviceToContext',
                        },
                        CONFIRM_VIDEO_OPTION: {
                          cond: 'hasSelectedAVideoInputDevice',
                          target: 'video',
                          actions: ['turnOnVideoOnTwilio'],
                        },
                        CANCEL_VIDEO_OPTIONS_MODAL: 'noVideo',
                      },
                    },
                    video: {
                      entry: ['reportHostIsSharingVideo'],
                      exit: ['reportHostIsNotSharingVideo'],
                      on: {
                        HIDE_VIDEO: {
                          target: 'noVideo',
                          actions: 'turnOffVideoOnTwilio',
                        },
                      },
                    },
                  },
                },
                microphone: {
                  initial: 'checking',
                  states: {
                    checking: {
                      always: [
                        {
                          cond: 'choseMicrophoneMuted',
                          target: 'muted',
                        },
                        {
                          target: 'unmuted',
                        },
                      ],
                    },
                    muted: {
                      entry: 'ensureMicrophoneMuted',
                      on: {
                        TOGGLE_MUTE: 'unmuted',
                        UNMUTE: 'unmuted',
                      },
                    },
                    unmuted: {
                      entry: 'ensureMicrophoneUnmuted',
                      on: {
                        TOGGLE_MUTE: 'muted',
                        MUTE: 'muted',
                      },
                    },
                  },
                },
              },
            },
            callErrored: {
              entry: 'reportHasNotJoinedCall',
              type: 'final',
            },
          },
        },
      },
    },
  },
});

export interface ComplexMachineContext {
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  selectedAudioInputDevice?: MediaDeviceInfo;
  selectedAudioOutputDevice?: MediaDeviceInfo;
  selectedVideoInputDevice?: MediaDeviceInfo;
  isJoiningMuted: boolean;
  anonymousSessionId?: string;
  twilioMeetingRoomName?: string;
  twilioMeetingAuthToken?: string;
}

export type ComplexMachineEvent =
  | {
      type: 'RECEIVE_DATA';
      data: GetDemoMatterportViewingSubscription | undefined;
      dataHasErrored: boolean;
    }
  | {
      type: 'REPORT_NO_PERMISSION_TO_VIEW';
    }
  | {
      type: 'OPEN_PROPERTY_MODAL';
    }
  | {
      type: 'CLOSE_PROPERTY_MODAL';
    }
  | {
      type: 'UPDATE_PROPERTY';
      id: string;
    }
  | {
      type: 'ADDED_DISPLAY_NAME';
      name: string;
    }
  | {
      type: 'REPORT_VIEWING_STARTED';
    }
  | {
      type: 'JOIN_VIEWING';
    }
  | {
      type: 'BEGIN_CALL_MUTED';
    }
  | {
      type: 'PRESS_CALL_TAB';
    }
  | {
      type: 'RECEIVE_NEW_MESSAGES';
    }
  | {
      type: 'REQUEST_CONTROL_AS_VIEWER';
    }
  | {
      type: 'SEND_MESSAGE';
      message: string;
    }
  | {
      type: 'PRESS_CHAT_TAB';
    }
  | {
      type: 'GIVE_CONTROL_BACK_TO_HOST';
    }
  | {
      type: 'GIVE_CONTROL_TO_VIEWER';
      viewerId: string;
    }
  | {
      type: 'RETRIEVE_CONTROL_AS_HOST';
    }
  | {
      type: 'REPORT_IN_CONTROL';
    }
  | {
      type: 'JOIN_CALL';
    }
  | {
      type: 'BEGIN_CALL';
    }
  | {
      type: 'TURN_ON_VIDEO';
    }
  | {
      type: 'CLOSE_CALL_OPTIONS_MODAL';
    }
  | {
      type: 'END_CALL';
    }
  | {
      type: 'OPEN_CALL_OPTIONS_MODAL';
    }
  | {
      type: 'CONFIRM_VIDEO_OPTION';
    }
  | {
      type: 'HIDE_VIDEO';
    }
  | {
      type: 'UNMUTE';
    }
  | {
      type: 'SEND_FOLLOWUP_EMAIL_TO_ATTENDEES';
    }
  | {
      type: 'REFUSE_SEND_FOLLOWUP_EMAIL_TO_ATTENDEES';
    }
  | {
      type: 'TOGGLE_MUTE';
    }
  | {
      type: 'REFUSE_TO_JOIN_CALL';
    }
  | {
      type: 'MUTE';
    }
  | {
      type: 'CHOOSE_DEVICE';
      deviceType: MediaDeviceType;
      device: MediaDeviceInfo | null;
    }
  | {
      type: 'CANCEL_VIDEO_OPTIONS_MODAL';
    }
  | {
      type: 'done.invoke.requestTwilioAudioOptions';
      data: {
        audioInputDevices: MediaDeviceInfo[];
        audioOutputDevices: MediaDeviceInfo[];
        videoInputDevices: MediaDeviceInfo[];
      };
    }
  | {
      type: 'done.invoke.checkUserPin';
      data: string;
    };

export type MediaDeviceType =
  | 'selectedAudioInputDevice'
  | 'selectedAudioOutputDevice'
  | 'selectedVideoInputDevice';

export type ComplexMachineState = StateWithMatches<
  ComplexMachineContext,
  ComplexMachineEvent,
  'complexMachine'
>;
