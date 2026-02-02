import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);
  private readonly PRODUCTION_RATE = 10; // Duplicate constant (should be shared config)

  constructor(private prisma: PrismaService) {}

  async scheduleAction(
    villageId: number,
    type: string,
    data: any,
    durationSeconds: number,
    cost: { wood: number; clay: number; iron: number; crop: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Village & Resources
      const village = await tx.village.findUnique({
        where: { id: villageId },
        include: { resources: true },
      });

      if (!village || !village.resources) {
        throw new Error('Village or resources not found');
      }

      // 2. Calculate Production (Lazy Update)
      const now = new Date();
      const lastTick = new Date(village.lastTick);
      const diffSeconds = (now.getTime() - lastTick.getTime()) / 1000;
      let currentWood = village.resources.wood;
      let currentClay = village.resources.clay;
      let currentIron = village.resources.iron;
      let currentCrop = village.resources.crop;

      if (diffSeconds > 0) {
        const produced = diffSeconds * this.PRODUCTION_RATE;
        currentWood += produced;
        currentClay += produced;
        currentIron += produced;
        currentCrop += produced;
      }

      // 3. Check & Deduct Cost
      if (
        currentWood < cost.wood ||
        currentClay < cost.clay ||
        currentIron < cost.iron ||
        currentCrop < cost.crop
      ) {
        throw new Error('Insufficient resources');
      }

      const newWood = currentWood - cost.wood;
      const newClay = currentClay - cost.clay;
      const newIron = currentIron - cost.iron;
      const newCrop = currentCrop - cost.crop;

      // 4. Update Resources & LastTick
      await tx.resources.update({
        where: { id: village.resources.id },
        data: {
          wood: newWood,
          clay: newClay,
          iron: newIron,
          crop: newCrop,
        },
      });

      await tx.village.update({
        where: { id: villageId },
        data: { lastTick: now },
      });

      // 5. Create Action
      const startTime = now;
      const endTime = new Date(now.getTime() + durationSeconds * 1000);

      const action = await tx.actionQueue.create({
        data: {
          villageId,
          type,
          data: JSON.stringify(data),
          startTime,
          endTime,
          status: 'PENDING',
        },
      });

      this.logger.log(
        `
        Scheduled action ${action.id} (${type}) for village ${villageId},
      `,
      );
      return action;
    });
  }
}
