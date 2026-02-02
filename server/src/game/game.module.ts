import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { ResourceService } from './resources.service';
import { BuildingService } from './building.service';
import { ActionService } from './action.service';
import { ActionWorkerService } from './action.worker';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [GameController],
  providers: [
    ResourceService,
    BuildingService,
    ActionService,
    ActionWorkerService,
    PrismaService,
  ],
})
export class GameModule {}
