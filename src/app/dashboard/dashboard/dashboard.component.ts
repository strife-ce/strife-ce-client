import { EChatAccountState } from './../../data/common/models/transient/chat-account';
import { environment } from 'app/data/common-imports';
import { Parse } from 'app/data/services';
import { Component, OnInit, ElementRef, ViewChild, Injector, AfterViewChecked } from '@angular/core';
import * as io from 'socket.io-client';
import { EC2ServerMessage, ES2ClientMessage, ChatAccount, EHeroEnum, HeroEnumText, EPetEnum, PetEnumText, PartyMember, Party, EGameMode, EAccountFlags, Account, User, EUserSettingEnum, MatchInfo } from 'app/data/models';
import { View } from '@app/views/view';
import { AccountService, UserService } from '@app/data/modelservices';
import { HttpClient } from '@angular/common/http';

import { beep } from './sounds';

interface IJoinInfo { secret: string; host: string; port: string; }

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent extends View implements OnInit, AfterViewChecked {
  private socket: SocketIOClient.Socket;
  public chatAccountMap: Map<string, ChatAccount>;
  public messages: Array<{ message: string, account: ChatAccount, room: string, highlight?: boolean }>;
  public EHeroEnum = EHeroEnum;
  public HeroEnumText = HeroEnumText;
  public EPetEnum = EPetEnum;
  public PetEnumText = PetEnumText;
  public EGameMode = EGameMode;
  public EAccountFlags = EAccountFlags;
  public EChatAccountState = EChatAccountState;
  public EUserSettingEnum = EUserSettingEnum;

  public Array = Array;
  public chatDisabled = true;
  public selectedHero: EHeroEnum;
  public selectedPet: EPetEnum;
  public searchingTime = 0;
  public selectedGameModes = {};
  public queueStates = {};
  public isChatAudioMuted: boolean;
  private party: Party;
  private partyMember: PartyMember;
  private account: Account;
  private beepAudio = new Audio(beep);
  public user: User;
  private lastJoinInfo: IJoinInfo = null;

  public state: EChatAccountState;

  private stateSwitchCounter = 0;

  @ViewChild('sendMsgInput') sendMsgInput: ElementRef;
  @ViewChild('chatScrollContainer') private chatScrollContainer: ElementRef;

  constructor(protected injector: Injector, private accountService: AccountService, private userService: UserService, private http: HttpClient) {
    super(injector);
  }


  public async ngOnInit() {
    this.chatDisabled = false;
    this.chatAccountMap = new Map();
    this.messages = new Array();
    this.selectedGameModes = { [EGameMode.MODE_1ON1]: true, [EGameMode.MODE_2ON2]: false, [EGameMode.MODE_3ON3]: false, [EGameMode.MODE_4ON4]: false, [EGameMode.MODE_5ON5]: true };

    this.userService.getCurrentUser().then(user => {
      this.user = user;
      this.isChatAudioMuted = this.user.getSetting(EUserSettingEnum.CHAT_MUTE, false);
      this.selectedHero = Number(this.user.getSetting(EUserSettingEnum.LAST_HERO_SELECTION, EHeroEnum.BANDITO));
      this.selectedPet = Number(this.user.getSetting(EUserSettingEnum.LAST_PET_SELECTION, EPetEnum.BOUNDER));
      this.selectedGameModes = JSON.parse(this.user.getSetting(EUserSettingEnum.LAST_GAMEMODE_SELECTION, JSON.stringify(this.selectedGameModes)));
    });

    this.queueStates = { [EGameMode.MODE_1ON1]: 0, [EGameMode.MODE_2ON2]: 0, [EGameMode.MODE_3ON3]: 0, [EGameMode.MODE_4ON4]: 0, [EGameMode.MODE_5ON5]: 0 };

    this.accountService.getCurrentAccount().then((account) => {
      this.account = account;
    });

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
        // this.messages.push({ message: 'this is a message from me @pad2', account: account, room: 'general' });
        this.chatAccountMap.set(account.id, account);
      }
    });

    this.socket.on(ES2ClientMessage.CHAT_MSG, message => {
      if (this.account && ((message.message as string).toLowerCase().indexOf('@' + this.account.name.toLowerCase()) >= 0 ||
        (message.message as string).toLowerCase().indexOf('@all') >= 0 ||
        (message.message as string).toLowerCase().indexOf('@everyone') >= 0 ||
        (message.message as string).toLowerCase().indexOf('@everybody') >= 0)) {
        message.highlight = true;
        this.playSoundNotification();
      }
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

    this.socket.on(ES2ClientMessage.MATCH_READY, (joinInfo: IJoinInfo) => {
      this.setState(EChatAccountState.INGAME);
      this.stateSwitchCounter++;
      this.lastJoinInfo = joinInfo;
      this.joinMatch(this.lastJoinInfo);
    });

    this.socket.on(ES2ClientMessage.MATCH_FINISHED, () => {
      if (this.state === EChatAccountState.INGAME) {
        this.setState(EChatAccountState.IDLE);
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

    this.http.get('https://www.patreon.com/strife_ce').subscribe((data) => console.log(data));
  }

  public joinMatch(joinInfo: IJoinInfo) {
    if (!joinInfo) {
      joinInfo = this.lastJoinInfo;
    }
    if (window && (window as any).process) {
      const { ipcRenderer } = (<any>window).require('electron');
      ipcRenderer.send('start-strife', { host: joinInfo.host, port: joinInfo.port, secret: joinInfo.secret });
    }
  }

  public cancelMatch() {
    delete this.lastJoinInfo;
    this.setState(EChatAccountState.IDLE);
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

  public playSoundNotification() {
    if (!this.isChatAudioMuted) {
      this.beepAudio.play();
    }
  }

  public toggleMute() {
    this.isChatAudioMuted = !this.isChatAudioMuted;
    this.user.setSetting(EUserSettingEnum.CHAT_MUTE, this.isChatAudioMuted, true);
  }

  public startGameSearch() {
    this.user.setSetting(EUserSettingEnum.LAST_HERO_SELECTION, this.selectedHero);
    this.user.setSetting(EUserSettingEnum.LAST_PET_SELECTION, this.selectedPet);
    this.user.setSetting(EUserSettingEnum.LAST_GAMEMODE_SELECTION, JSON.stringify(this.selectedGameModes), true);
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
