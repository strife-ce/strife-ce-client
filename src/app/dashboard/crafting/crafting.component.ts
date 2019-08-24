import { ItemService } from '@app/data/modelservices';
import { Component, OnInit, Input, Injector } from '@angular/core';
import { User } from '@app/data/models';
import { View } from '@app/views/view';

@Component({
  selector: 'app-dashboard-crafting',
  templateUrl: './crafting.component.html',
  styleUrls: ['./crafting.component.css']
})
export class CraftingComponent extends View implements OnInit {
  @Input() user: User;

  constructor(private itemService: ItemService, injector: Injector) {
    super(injector);
  }

  public ngOnInit() {

  }
}
