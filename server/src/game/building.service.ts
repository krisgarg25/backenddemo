import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ActionService } from './action.service';

@Injectable()
export class BuildingService {
  private readonly logger = new Logger(BuildingService.name);

  constructor(
    private prisma: PrismaService,
    private actionService: ActionService,
  ) {}

  async startUpgrade(villageId: number, buildingType: string) {
    // 1. Define Cost and Duration (Mock Logic)
    const cost = { wood: 50, clay: 50, iron: 50, crop: 50 };
    const durationSeconds = 10; // Fast for demo

    // 2. Schedule Action (Transactional: Check Resources -> Deduct -> Create Action)
    const action = await this.actionService.scheduleAction(
      villageId,
      'BUILD_UPGRADE',
      { buildingType },
      durationSeconds,
      cost,
    );

    return {
      message: `Construction started for ${buildingType}`,
      action,
    };
  }

  async upgradeBuilding(villageId: number, type: string) {
    // Find existing building or create new
    const building = await this.prisma.building.findFirst({
      where: { villageId, type },
    });

    if (building) {
      await this.prisma.building.update({
        where: { id: building.id },
        data: { level: { increment: 1 } },
      });
      this.logger.log(
        `Upgraded ${type} to level ${building.level + 1} in village ${villageId}`,
      );
    } else {
      await this.prisma.building.create({
        data: { villageId, type, level: 1 },
      });
      this.logger.log(
        `Constructed new ${type} (Level 1) in village ${villageId}`,
      );
    }
  }
}
