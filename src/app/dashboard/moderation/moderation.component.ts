import { GlobalPlayerRestriction, ERestrictionType } from './../../data/common/models/global-player-restriction';
import { GlobalPlayerService } from './../../data/common/modelservices/global-player.service';
import { AccountService } from '@app/data/modelservices';
import { Component, OnInit, Input, Injector } from '@angular/core';
import { User, Account } from '@app/data/models';
import { View } from '@app/views/view';

@Component({
  selector: 'app-dashboard-moderation',
  templateUrl: './moderation.component.html',
  styleUrls: ['./moderation.component.css']
})
export class ModerationComponent extends View implements OnInit {
  @Input() user: User;

  public accounts: Array<Account>;

  constructor(private accountService: AccountService, private globalPlayerService: GlobalPlayerService, injector: Injector) {
    super(injector);
    this.accounts = new Array();
  }

  public ngOnInit() {
  }

  public async search(accountName: string) {
    if (accountName.length >= 3) {
      const accounts = await this.accountService.getAccountsByName(accountName, ['globalPlayer'], ['globalPlayer.chatRestriction', 'globalPlayer.matchRestriction', 'globalPlayer.accounts']);
      this.accounts = accounts.sort((a, b) => (a.name.length < b.name.length) ? -1 : 1);
    } else {
      this.errorMessage('Put in at least 3 characters');
    }
  }

  public async restrictedSearch() {
    const globalPlayers = await this.globalPlayerService.getWithActiveRestrictions();
    const accounts = new Set<Account>();
    for (const globalPlayer of globalPlayers) {
      const targetAccount = (globalPlayer.matchRestriction) ? globalPlayer.matchRestriction.targetAccount : globalPlayer.chatRestriction.targetAccount;
      targetAccount.globalPlayer = globalPlayer;
      accounts.add(targetAccount);
    }
    this.accounts = Array.from(accounts);
  }

  public async lastLoggedInSearch(count) {
    this.accounts = await this.accountService.getLastLoggedIn(count, ['globalPlayer'], ['globalPlayer.chatRestriction', 'globalPlayer.matchRestriction', 'globalPlayer.accounts']);
  }

  public getAliases(account: Account) {
    return account.globalPlayer.accounts.filter(a => a.id !== account.id).map(a => a.name).join(', ');
  }

  public async addRestriction(account: Account, restrictionDurationInHours: number, isChatRestriction: boolean) {
    const globalPlayer = await this.globalPlayerService.getById(account.globalPlayer.id, ['accounts', 'chatRestriction', 'matchRestriction', 'tokens']);
    let restriction = (isChatRestriction) ? globalPlayer.chatRestriction : globalPlayer.matchRestriction;
    if (restriction) {
      restriction.destroy();
    }

    if (restrictionDurationInHours <= 0) {
      restriction = null;
    } else {
      restriction = new GlobalPlayerRestriction(this.user.account, account, 'Contact us in discord for details', (isChatRestriction) ? ERestrictionType.CHAT : ERestrictionType.MATCH, new Date(), restrictionDurationInHours);
      await restriction.save();
    }

    if (isChatRestriction) {
      globalPlayer.chatRestriction = restriction;
    } else {
      globalPlayer.matchRestriction = restriction;
    }

    globalPlayer.save();
    account.globalPlayer = globalPlayer;
    this.successMessage('Restrictions updated');
  }
}
