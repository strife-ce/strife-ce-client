import { environment } from 'app/data/common-imports';
import { Parse } from 'app/data/services';
import { Component, OnInit, ElementRef, ViewChild, Injector, AfterViewChecked } from '@angular/core';
import * as io from 'socket.io-client';
import { EC2ServerMessage, ES2ClientMessage, ChatAccount, EHeroEnum, HeroEnumText, PartyMember, Party } from 'app/data/models';
import { View } from '@app/views/view';

enum EState {
  INIT,
  SEARCHING,
  PREPARING_MATCH
}

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent extends View implements OnInit, AfterViewChecked {
  private socket: SocketIOClient.Socket;
  public chatAccountMap: Map<string, { id: string, name: string }>;
  public messages: Array<{ message: string, account: ChatAccount, room: string }>;
  public EHeroEnum = EHeroEnum;
  public HeroEnumText = HeroEnumText;
  public Array = Array;
  public chatDisabled = true;
  public selectedHero: EHeroEnum;
  public searchingTime = 0;
  private party: Party;
  private partyMember: PartyMember;

  public state: EState;
  public EState = EState;

  @ViewChild('sendMsgInput') sendMsgInput: ElementRef;
  @ViewChild('chatScrollContainer') private chatScrollContainer: ElementRef;

  constructor(protected injector: Injector) {
    super(injector);
  }

  public ngOnInit() {
    this.state = EState.INIT;
    this.selectedHero = Number(this.getSessionStorage('LAST_HERO_SELECTION', EHeroEnum.BASTION));
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

    this.socket.on(ES2ClientMessage.CHAT_USERLIST, userlistMsg => {
      this.chatAccountMap.clear();
      for (const account of userlistMsg.accounts) {
        this.chatAccountMap.set(account.id, account);
      }
    });

    this.socket.on(ES2ClientMessage.CHAT_MSG, message => {
      this.messages.push(message);
    });

    this.socket.on(ES2ClientMessage.PARTY_CREATED, (party) => {
      this.party = party;
      this.partyMember.ready = true;
      this.socket.emit(EC2ServerMessage.PARTY_UPDATE_STATE, this.partyMember);
    });

    this.socket.on(ES2ClientMessage.PARTY_STARTED_MATCHMAKING, () => {
      this.state = EState.SEARCHING;
      console.log('PARTY CREATED!!');
      const party = this.party;
      const intervalHandler = setInterval(() => {
        if (this.state !== EState.SEARCHING || this.party !== party) {
          clearInterval(intervalHandler);
        } else {
          this.searchingTime++;
        }
      }, 1000);
    });

    this.socket.on(ES2ClientMessage.MATCH_PREPARING, () => {
      this.state = EState.PREPARING_MATCH;
    });

    this.socket.on(ES2ClientMessage.MATCH_READY, (joinInfo: { secret: string, host: string, port: string }) => {
      this.state = EState.INIT;
      if (window && (window as any).process) {
        const { ipcRenderer } = (<any>window).require('electron');
        ipcRenderer.send('start-strife', { host: joinInfo.host, port: joinInfo.port, secret: joinInfo.secret });
      }
    });

    this.scrollChatToBottom();
  }

  ngAfterViewChecked() {
    this.scrollChatToBottom();
  }

  public sendMessage() {
    this.socket.emit(EC2ServerMessage.CHAT_MSG, { message: this.sendMsgInput.nativeElement.value, room: 'general' });
    this.sendMsgInput.nativeElement.value = '';
  }

  public startGameSearch() {
    this.setSessionStorage('LAST_HERO_SELECTION', this.selectedHero);
    this.partyMember = PartyMember.create(this.selectedHero);
    this.socket.emit(EC2ServerMessage.PARTY_CREATE, this.partyMember);
  }

  public cancelGameSearch() {
    this.socket.emit(EC2ServerMessage.PARTY_LEAVE);
    this.state = EState.INIT;
    this.searchingTime = 0;
  }

  public scrollChatToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }
}
