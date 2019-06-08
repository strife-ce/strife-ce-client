import { GamemodeTeamSize as GameModeTeamSize } from './../../data/common/models/transient/party';
import { EChatAccountState } from './../../data/common/models/transient/chat-account';
import { environment } from 'app/data/common-imports';
import { Parse } from 'app/data/services';
import { Component, OnInit, ElementRef, ViewChild, Injector, AfterViewChecked } from '@angular/core';
import * as io from 'socket.io-client';
import { EC2ServerMessage, ES2ClientMessage, ChatAccount, EHeroEnum, HeroEnumText, EPetEnum, PetEnumText, PetEnumGameName, PartyMember, Party, EGameMode, EAccountFlags, Account, User, EUserSettingEnum, MatchInfo, HeroEnumGameName, EPartyMemberState } from 'app/data/models';
import { View } from '@app/views/view';
import { AccountService, UserService } from '@app/data/modelservices';
import { HttpClient } from '@angular/common/http';

import { beep } from './sounds';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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
  public EPartyMemberState = EPartyMemberState;
  public HeroEnumText = HeroEnumText;
  public HeroEnumGameName = HeroEnumGameName;
  public EPetEnum = EPetEnum;
  public PetEnumText = PetEnumText;
  public PetEnumGameName = PetEnumGameName;
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
  public selectedBotDifficulty = 'normal';
  public queueStates = {};
  public isChatAudioMuted: boolean;
  public party: Party;
  public inviteParty: Party;
  private partyMember: PartyMember;
  private account: Account;
  public chatAccount: ChatAccount = null;
  private beepAudio = new Audio(beep);
  public user: User;
  private lastJoinInfo: IJoinInfo = null;
  readonly allTagTreshold = 3 * 60000;
  private lastAllTag = new Date(new Date().getTime() - this.allTagTreshold);
  public latestPatrons: Array<ChatAccount> = [];
  private partyPlayerInvites: Set<ChatAccount> = new Set();
  public patreonData = { pledge_sum: 0 };
  public playTabs = {
    MATCHMAKING: { name: 'Match', disabled: false, active: true },
    STORY: { name: 'Story', disabled: false, active: false },
    BOT_GAME: { name: 'Against Bots', disabled: false, active: false },
    EARLY_ACCESS: { name: 'Early Access', disabled: false, active: false },
  };

  public chatTabs = {
    GENERAL: { name: 'general', label: 'General Chat', disabled: false, active: true },
  };

  private scrollBottomActive = false;


  public state: EChatAccountState;

  private stateSwitchCounter = 0;

  @ViewChild('sendMsgInput') sendMsgInput: ElementRef;
  @ViewChild('partyInvite') inviteModal: ElementRef;
  @ViewChild('chatScrollContainer') private chatScrollContainer: ElementRef;

  constructor(protected injector: Injector, private accountService: AccountService, private userService: UserService, private http: HttpClient, private modalService: NgbModal) {
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
      this.selectedBotDifficulty = this.user.getSetting(EUserSettingEnum.LAST_BOT_DIFFICULTY_SELECTION, 'normal');
    });

    this.accountService.getLatestPatrons(4).then(accounts => {
      this.latestPatrons = accounts.map(a => new ChatAccount(a));
    });

    this.queueStates = { [EGameMode.MODE_1ON1]: 0, [EGameMode.MODE_2ON2]: 0, [EGameMode.MODE_3ON3]: 0, [EGameMode.MODE_4ON4]: 0, [EGameMode.MODE_5ON5]: 0 };

    this.accountService.getCurrentAccount().then((account) => {
      this.account = account;
      this.chatAccount = new ChatAccount(account);
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
        for (let i = 0; i < 100; i++) {
          this.messages.push({ message: 'this is a message from me @pad2', account: account, room: 'general' });
        }

        this.chatAccountMap.set(account.id, account);
      }
    });

    this.socket.on(ES2ClientMessage.CHAT_MSG, message => {
      if (this.account && ((message.message as string).toLowerCase().indexOf('@' + this.account.name.toLowerCase()) >= 0 ||
        (message.message as string).toLowerCase().indexOf('@all') >= 0)) {
        message.highlight = true;
        this.playSoundNotification();
      }
      let arrivedAt = new Date().toLocaleString();
      if (arrivedAt.indexOf(',') >= 0) {
        arrivedAt = arrivedAt.split(',')[1].trim();
      } else if (arrivedAt.indexOf(' ')) {
        const parts = arrivedAt.split(' ');
        arrivedAt = parts[parts.length - 1];
      }
      message.arrivedAt = arrivedAt.trim();

      const raw = this.chatScrollContainer.nativeElement;
      this.scrollBottomActive = (raw.scrollTop + raw.offsetHeight) === raw.scrollHeight;
      this.messages.push(message);
    });

    this.socket.on(ES2ClientMessage.CHAT_UPDATE_ACCOUNT, account => {
      this.chatAccountMap.set(account.id, account);
    });

    this.socket.on(ES2ClientMessage.PARTY_INVITED, (party) => {
      this.inviteParty = party;
      this.setState(EChatAccountState.PARTYING);
      this.openModal(this.inviteModal);
    });

    this.socket.on(ES2ClientMessage.PARTY_UPDATED, (party) => {
      this.party = party;
      this.partyMember = this.party.members.find(m => m.chatAccount.id === this.chatAccount.id);
      this.selectedHero = this.partyMember.hero;
      this.selectedPet = this.partyMember.pet;
      this.setState(this.party.members.length > 1 ? EChatAccountState.PARTYING : EChatAccountState.IDLE);
      this.setGameModesByValue(this.party.gamemodes);
    });

    this.socket.on(ES2ClientMessage.PARTY_STARTED_MATCHMAKING, () => {
      this.setState(EChatAccountState.QUEUE);
      this.searchingTime = 0;
      const party = this.party;
      const intervalHandler = setInterval(() => {
        if (this.state !== EChatAccountState.QUEUE || this.party !== party) {
          clearInterval(intervalHandler);
        } else {
          this.searchingTime++;
        }
      }, 1000);
    });

    this.socket.on(ES2ClientMessage.PARTY_CANCELED_MATCHMAKING, (chatAccount) => {
      if (chatAccount.id !== this.chatAccount.id) {
        this.errorMessage(chatAccount.name + ' has aborted the search');
      }
      this.setState((this.party && this.party.members.length > 1) ? EChatAccountState.PARTYING : EChatAccountState.IDLE);
    });

    this.socket.on(ES2ClientMessage.MATCH_PREPARING, () => {
      this.setState(EChatAccountState.PREPARING_MATCH);
      const currentStateSwitchCount = this.stateSwitchCounter;
      setTimeout(() => {
        if (this.stateSwitchCounter === currentStateSwitchCount) {
          this.setState(EChatAccountState.IDLE);
          this.errorMessage('The gameserver didn\'t show up', 'Your game was aborted because the gameserver didn\'t show up.');
        }
      }, 30000);
    });

    this.socket.on(ES2ClientMessage.MATCH_READY, (joinInfo: IJoinInfo) => {
      this.setState(EChatAccountState.INGAME);
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
      this.party = null;
      this.setState(EChatAccountState.IDLE);
      // this.socket.removeAllListeners();
    });

    setTimeout(() => {
      this.scrollBottomActive = true;
      this.scrollChatToBottom();
    }, 500);

    this.http.get(environment.PARSE.URL.replace('/parse', '') + '/patreon').subscribe((data) => {
      if (!isNaN((data as any).pledge_sum)) {
        this.patreonData = data as any;
      }
    });

    setInterval(() => {
      this.http.get(environment.PARSE.URL.replace('/parse', '') + '/patreon').subscribe((data) => {
        if (!isNaN((data as any).pledge_sum)) {
          this.patreonData = data as any;
        }
      });
    }, 60 * 1000);
  }

  public joinMatch(joinInfo: IJoinInfo) {
    if (!joinInfo) {
      joinInfo = this.lastJoinInfo;
    }
    if (window && (window as any).process) {
      const { ipcRenderer } = (<any>window).require('electron');
      ipcRenderer.send('start-strife', { type: 'mmr', map: 'strife', host: joinInfo.host, port: joinInfo.port, secret: joinInfo.secret });
    }
  }

  public joinStoryMap(mapName: string) {
    if (window && (window as any).process) {
      const { ipcRenderer } = (<any>window).require('electron');
      ipcRenderer.send('start-strife', { type: 'story', map: mapName, name: this.chatAccount.name });
      this.successMessage('Game is loading', 'Strife is starting in the background!');
    }
  }

  public joinBotGame() {
    this.user.setSetting(EUserSettingEnum.LAST_HERO_SELECTION, this.selectedHero);
    this.user.setSetting(EUserSettingEnum.LAST_PET_SELECTION, this.selectedPet);
    this.user.setSetting(EUserSettingEnum.LAST_BOT_DIFFICULTY_SELECTION, this.selectedBotDifficulty, true);
    if (window && (window as any).process) {
      const { ipcRenderer } = (<any>window).require('electron');
      ipcRenderer.send('start-strife', { type: 'bot', map: 'strife', difficulty: this.selectedBotDifficulty, name: this.chatAccount.name, pet: PetEnumGameName.get(this.selectedPet), hero: HeroEnumGameName.get(this.selectedHero) });
      this.successMessage('Game is loading', 'Strife is starting in the background!');
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
    const value = this.sendMsgInput.nativeElement.value.trim() as string;
    if (value !== '') {
      if (value.toLowerCase().indexOf('@all') >= 0) {
        if (new Date().getTime() - this.lastAllTag.getTime() < this.allTagTreshold) {
          this.errorMessage('Too many @all tags', 'You are allowed to use @all only once every ' + (this.allTagTreshold / 1000) + ' seconds.');
          return;
        }
        this.lastAllTag = new Date();
      }
      this.socket.emit(EC2ServerMessage.CHAT_MSG, { message: value, room: 'general' });
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
    console.warn('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT');
    if (this.selectedHero === EHeroEnum.NO_HERO) {
      this.errorMessage('You have to select a hero first!');
    }

    const singleMode = !this.party || (this.party.members.length === 1);

    this.user.setSetting(EUserSettingEnum.LAST_HERO_SELECTION, this.selectedHero);
    this.user.setSetting(EUserSettingEnum.LAST_PET_SELECTION, this.selectedPet);
    this.user.setSetting(EUserSettingEnum.LAST_GAMEMODE_SELECTION, JSON.stringify(this.selectedGameModes), true);
    const gameModes = this.getGameModesValue();

    if (this.isPartyChief() && gameModes === 0) {
      this.errorMessage('No gamemode selected', 'Select at least one gamemode to play.');
    } else {
      if (singleMode) {
        this.partyMember = PartyMember.create(this.selectedHero, this.selectedPet);
        this.socket.emit(EC2ServerMessage.PARTY_CREATE, this.partyMember, gameModes, true);
      } else {
        console.warn('XXXXXXXXXXXXXX1');
        this.partyMember.state = EPartyMemberState.READY;
        this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember, gameModes);
      }
    }
  }

  public cancelGameSearch() {
    this.socket.emit(EC2ServerMessage.PARTY_CANCEL_MATCHMAKING);
    this.setState((this.party && this.party.members.length > 1) ? EChatAccountState.PARTYING : EChatAccountState.IDLE);
    this.searchingTime = 0;
  }

  public scrollChatToBottom(): void {
    try {
      if (this.scrollBottomActive) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
        this.scrollBottomActive = false;
      }
    } catch (err) {
    }
  }

  public getChatAccounts(includingMyself = true): Array<ChatAccount> {
    if (includingMyself) {
      return Array.from(this.chatAccountMap.values());
    } else {
      return Array.from(this.chatAccountMap.values()).filter(acc => acc.id !== this.chatAccount.id);
    }
  }

  public switchTab(tabs, tab) {
    for (const key of Object.keys(tabs)) {
      tabs[key].active = false;
    }
    tab.active = true;
  }

  private setState(state: EChatAccountState) {
    if (state !== this.state) {
      this.state = state;
      this.stateSwitchCounter++;
      this.socket.emit(EC2ServerMessage.CHAT_UPDATE_STATE, this.state);
    }
  }

  public changePartyInviteState(chatAccount: ChatAccount, event) {
    const shouldAdd = event.target.checked;
    if (shouldAdd) {
      this.partyPlayerInvites.add(chatAccount);
    } else {
      this.partyPlayerInvites.delete(chatAccount);
    }
  }

  public inviteToParty() {
    const partyPlayers = Array.from(this.partyPlayerInvites).filter(p => p.canReceivePartyInvite);
    if (partyPlayers.length > 0) {
      if (!this.party) {
        this.partyMember = PartyMember.create(this.selectedHero, this.selectedPet);
        this.socket.emit(EC2ServerMessage.PARTY_CREATE, this.partyMember, this.getGameModesValue());
        this.socket.once(ES2ClientMessage.PARTY_CREATED, (party) => {
          this.party = party;
          this.partyMember = this.party.members.find(m => m.chatAccount.id === this.chatAccount.id);
          this.socket.emit(EC2ServerMessage.PARTY_INVITE, partyPlayers);
        });
      } else {
        this.socket.emit(EC2ServerMessage.PARTY_INVITE, partyPlayers);
      }
      this.setState(EChatAccountState.PARTYING);
    }
  }

  public getHeroIcon(hero: EHeroEnum) {
    if (hero === EHeroEnum.RANDOM) {
      return 'assets/images/icons/random.png';
    } else if (hero === EHeroEnum.NO_HERO) {
      return 'assets/images/icons/questionmark.png';
    } else {
      return 'assets/images/gameicons/heroes/' + HeroEnumGameName.get(hero) + '/gearicon.tga.3.png';
    }
  }

  public getPetIcon(pet: EPetEnum) {
    if (pet === EPetEnum.NO_PET) {
      return 'assets/images/icons/questionmark.png';
    } else {
      return 'assets/images/gameicons/pets/' + PetEnumGameName.get(pet) + '/icon.tga.3 (3).png';
    }
  }

  public openModal(content) {
    this.partyPlayerInvites.clear();
    this.modalService.open(content, { backdropClass: 'ce-backdrop' }).result.then((result) => {
    });
  }

  public selectHero(hero) {
    if (this.selectedHero !== hero) {
      this.selectedHero = hero;
      if (this.party) {
        this.partyMember.hero = this.selectedHero;
        this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember);
      }
    }
  }

  public selectPet(pet) {
    if (this.selectedPet = pet) {
      this.selectedPet = pet;
      if (this.party) {
        this.partyMember.pet = this.selectedPet;
        this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember);
      }
    }
  }

  public leaveParty() {
    if (this.party) {
      this.socket.emit(EC2ServerMessage.PARTY_LEAVE, this.party.id);
      this.party = null;
      this.setState(EChatAccountState.IDLE);
    }
  }

  public acceptPartyInvite(inviteParty) {
    const heroIsTaken = (this.inviteParty.members.find(m => m.hero === this.selectedHero) !== undefined);
    this.socket.emit(EC2ServerMessage.PARTY_INVITE_ACCEPT, inviteParty.id, heroIsTaken ? EHeroEnum.NO_HERO : this.selectedHero, this.selectedPet);
    this.inviteParty = null;
    this.setState(EChatAccountState.PARTYING);
  }

  public declinePartyInvite(inviteParty) {
    this.socket.emit(EC2ServerMessage.PARTY_INVITE_DECLINE, inviteParty.id);
    this.inviteParty = null;
    this.setState(EChatAccountState.IDLE);
  }

  public getPlayerOfHero(hero: EHeroEnum) {
    if (this.party) {
      return this.party.members.find(m => m.hero === hero);
    }
    return undefined;
  }

  public isPartyChief() {
    return (!this.party || this.party.chief.id === this.chatAccount.id);
  }

  public isGameModeEnabledInParty(gameMode: EGameMode) {
    return this.isPartyChief() && GameModeTeamSize.get(gameMode) >= this.party.members.length;
  }

  private getGameModesValue() {
    let gameModes = 0;
    for (const val of this.getEnumValues(EGameMode)) {
      if (this.selectedGameModes[val]) {
        gameModes += val;
      }
    }
    return gameModes;
  }

  private setGameModesByValue(value: number) {
    for (const val of this.getEnumValues(EGameMode)) {
      this.selectedGameModes[val] = ((val & value) > 0);
    }
  }

  public partyGameModeChanged(gameMode: EGameMode, newValue) {
    if (this.selectedGameModes[gameMode] !== newValue) {
      this.selectedGameModes[gameMode] = newValue;
      this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember, this.getGameModesValue());
    }
  }

  public notReady() {
    this.partyMember.state = EPartyMemberState.NORMAL;
    this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember);
  }
}
