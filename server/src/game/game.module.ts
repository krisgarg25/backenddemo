import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { ResourceService } from './resources.service';
import { BuildingService } from './building.service';
import { QueueService } from './queue.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [GameController],
  providers: [ResourceService, BuildingService, QueueService, PrismaService],
})
export class GameModule {}
