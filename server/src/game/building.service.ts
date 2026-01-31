import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ResourceService } from './resources.service';
import { QueueService } from './queue.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BuildingService {
  private readonly logger = new Logger(BuildingService.name);

  constructor(
    private prisma: PrismaService,
    private resourceService: ResourceService,
    private queueService: QueueService,
  ) {}

  async startUpgrade(villageId: number, buildingType: string) {
    // 1. Define Cost and Duration (Mock Logic)
    const cost = { wood: 50, clay: 50, iron: 50, crop: 50 };
    const durationSeconds = 10; // Fast for demo

    // 2. Validate and Deduct Resources
    // This throws if insufficient resources
    await this.resourceService.deductResources(villageId, cost);

    // 3. Create Job
    const finishTime = new Date(new Date().getTime() + durationSeconds * 1000);
    const jobId = uuidv4();

    this.queueService.addJob({
      id: jobId,
      villageId,
      type: `Upgrade ${buildingType}`,
      finishTime,
      action: async () => {
        await this.upgradeBuilding(villageId, buildingType);
      },
    });

    return {
      message: `Construction started for ${buildingType}`,
      finishTime,
      cost,
    };
  }

  private async upgradeBuilding(villageId: number, type: string) {
    // Find existing building or create new
    // We treat 'type' as unique per village for simplicity in this demo,
    // or we just find the first one.
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
