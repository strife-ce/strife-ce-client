import { EChatAccountState } from './../../data/common/models/transient/chat-account';
import { environment } from 'app/data/common-imports';
import { Parse } from 'app/data/services';
import { Component, OnInit, ElementRef, ViewChild, Injector, AfterViewChecked } from '@angular/core';
import * as io from 'socket.io-client';
import { EC2ServerMessage, ES2ClientMessage, ChatAccount, EHeroEnum, HeroEnumText, EPetEnum, PetEnumText, PartyMember, Party, EGameMode, EAccountFlags, Account } from 'app/data/models';
import { View } from '@app/views/view';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent extends View implements OnInit, AfterViewChecked {
  private socket: SocketIOClient.Socket;
  public chatAccountMap: Map<string, ChatAccount>;
  public messages: Array<{ message: string, account: ChatAccount, room: string }>;
  public EHeroEnum = EHeroEnum;
  public HeroEnumText = HeroEnumText;
  public EPetEnum = EPetEnum;
  public PetEnumText = PetEnumText;
  public EGameMode = EGameMode;
  public EAccountFlags = EAccountFlags;
  public EChatAccountState = EChatAccountState;

  public Array = Array;
  public chatDisabled = true;
  public selectedHero: EHeroEnum;
  public selectedPet: EPetEnum;
  public searchingTime = 0;
  public selectedGameModes = {};
  public queueStates = {};
  private party: Party;
  private partyMember: PartyMember;

  public state: EChatAccountState;

  private stateSwitchCounter = 0;

  @ViewChild('sendMsgInput') sendMsgInput: ElementRef;
  @ViewChild('chatScrollContainer') private chatScrollContainer: ElementRef;

  constructor(protected injector: Injector) {
    super(injector);
  }


  public ngOnInit() {
    this.selectedHero = Number(this.getSessionStorage('LAST_HERO_SELECTION', EHeroEnum.BANDITO));
    this.selectedPet = Number(this.getSessionStorage('LAST_PET_SELECTION', EPetEnum.BOUNDER));
    const defaultSelectedGameModes = {};
    defaultSelectedGameModes[EGameMode.MODE_1ON1] = true;
    defaultSelectedGameModes[EGameMode.MODE_2ON2] = false;
    defaultSelectedGameModes[EGameMode.MODE_3ON3] = false;
    defaultSelectedGameModes[EGameMode.MODE_4ON4] = false;
    defaultSelectedGameModes[EGameMode.MODE_5ON5] = true;
    this.selectedGameModes = JSON.parse(this.getSessionStorage('LAST_GAMEMODE_SELECTION', JSON.stringify(defaultSelectedGameModes)));
    this.queueStates = { [EGameMode.MODE_1ON1]: 0, [EGameMode.MODE_2ON2]: 0, [EGameMode.MODE_3ON3]: 0, [EGameMode.MODE_4ON4]: 0, [EGameMode.MODE_5ON5]: 0 };

    this.chatDisabled = false;
    this.chatAccountMap = new Map();
    this.messages = new Array();
    this.socket = io.connect(environment.LIVESERVER_URL);
    this.socket.on('connect', () => {
      this.socket.emit(EC2ServerMessage.AUTH_REQUEST, Parse.User.current().getSessionToken());
    });

    this.socket.on(ES2ClientMessage.AUTH_ACCEPTED, () => {
      this.chatDisabled = false;
      this.socket.emit(EC2ServerMessage.CHAT_JOIN_ROOM, 'general');
      this.setState(EChatAccountState.IDLE);
    });

    this.socket.on(ES2ClientMessage.QUEUE_STATES_UPDATE, (queueStates) => {
      this.queueStates = queueStates;
    });

    this.socket.on(ES2ClientMessage.CHAT_JOINED_ROOM, joinMsg => {
      if (!this.chatAccountMap.has(joinMsg.account.id)) {
        this.chatAccountMap.set(joinMsg.account.id, joinMsg.account);
      }
    });

    this.socket.on(ES2ClientMessage.CHAT_LEFT_ROOM, joinMsg => {
      if (this.chatAccountMap.has(joinMsg.account.id)) {
        this.chatAccountMap.delete(joinMsg.account.id);
      }
    });

    this.socket.on(ES2ClientMessage.CHAT_ACCOUNTLIST, (userlistMsg: { accounts: Array<ChatAccount>, room: string }) => {
      this.chatAccountMap.clear();
      for (const account of userlistMsg.accounts) {
        // this.messages.push({ message: 'this is a message from me', account: account, room: 'general' });
        this.chatAccountMap.set(account.id, account);
      }
    });

    this.socket.on(ES2ClientMessage.CHAT_MSG, message => {
      this.messages.push(message);
    });

    this.socket.on(ES2ClientMessage.CHAT_UPDATE_ACCOUNT, account => {
      this.chatAccountMap.set(account.id, account);
    });

    this.socket.on(ES2ClientMessage.PARTY_CREATED, (party) => {
      this.party = party;
      this.partyMember.ready = true;
      this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember);
    });

    this.socket.on(ES2ClientMessage.PARTY_STARTED_MATCHMAKING, () => {
      this.setState(EChatAccountState.QUEUE);
      this.stateSwitchCounter++;
      const party = this.party;
      const intervalHandler = setInterval(() => {
        if (this.state !== EChatAccountState.QUEUE || this.party !== party) {
          clearInterval(intervalHandler);
        } else {
          this.searchingTime++;
        }
      }, 1000);
    });

    this.socket.on(ES2ClientMessage.MATCH_PREPARING, () => {
      this.setState(EChatAccountState.PREPARING_MATCH);
      const currentStateSwitchCount = ++this.stateSwitchCounter;
      setTimeout(() => {
        if (this.stateSwitchCounter === currentStateSwitchCount) {
          this.setState(EChatAccountState.IDLE);
          this.errorMessage('The gameserver didn\'t show up', 'Your game was aborted because the gameserver didn\'t show up.');
        }
      }, 30000);
    });

    this.socket.on(ES2ClientMessage.MATCH_READY, (joinInfo: { secret: string, host: string, port: string }) => {
      this.state = EChatAccountState.IDLE;
      this.stateSwitchCounter++;
      if (window && (window as any).process) {
        const { ipcRenderer } = (<any>window).require('electron');
        ipcRenderer.send('start-strife', { host: joinInfo.host, port: joinInfo.port, secret: joinInfo.secret });
      }
    });

    this.socket.on('disconnect', () => {
      if (this.state !== EChatAccountState.IDLE) {
        this.errorMessage('Search was aborted', 'Your search was aborted because of a server restart');
      }
      this.setState(EChatAccountState.IDLE);
      // this.socket.removeAllListeners();
    });

    this.scrollChatToBottom();
  }

  ngAfterViewChecked() {
    this.scrollChatToBottom();
  }

  public sendMessage() {
    if (this.sendMsgInput.nativeElement.value.trim() !== '') {
      this.socket.emit(EC2ServerMessage.CHAT_MSG, { message: this.sendMsgInput.nativeElement.value, room: 'general' });
      this.sendMsgInput.nativeElement.value = '';
    }
  }

  public startGameSearch() {
    this.setSessionStorage('LAST_HERO_SELECTION', this.selectedHero);
    this.setSessionStorage('LAST_PET_SELECTION', this.selectedPet);
    this.setSessionStorage('LAST_GAMEMODE_SELECTION', JSON.stringify(this.selectedGameModes));
    let gameModes = 0;
    for (const val of this.getEnumValues(EGameMode)) {
      if (this.selectedGameModes[val]) {
        gameModes += val;
      }
    }

    if (gameModes === 0) {
      this.errorMessage('No gamemode selected', 'Select at least one gamemode to play.');
    } else {
      this.partyMember = PartyMember.create(this.selectedHero, this.selectedPet);
      this.socket.emit(EC2ServerMessage.PARTY_CREATE, this.partyMember, gameModes);
    }
  }

  public cancelGameSearch() {
    this.socket.emit(EC2ServerMessage.PARTY_LEAVE);
    this.setState(EChatAccountState.IDLE);
    this.stateSwitchCounter++;
    this.searchingTime = 0;
  }

  public scrollChatToBottom(): void {
    try {
      const scrollDiff = this.chatScrollContainer.nativeElement.scrollHeight - this.chatScrollContainer.nativeElement.scrollTop;
      if (scrollDiff <= 730) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) { }
  }

  public getChatAccounts(): Array<ChatAccount> {
    return Array.from(this.chatAccountMap.values());
  }

  private setState(state: EChatAccountState) {
    if (state !== this.state) {
      this.state = state;
      this.socket.emit(EC2ServerMessage.CHAT_UPDATE_STATE, this.state);
    }
  }
}
