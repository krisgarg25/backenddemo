import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { BuildingService } from './building.service';

@Injectable()
export class ActionWorkerService {
  private readonly logger = new Logger(ActionWorkerService.name);
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private buildingService: BuildingService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async handlePendingActions() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      const now = new Date();

      // 1. Poll for due actions
      const actions = await this.prisma.actionQueue.findMany({
        where: {
          status: 'PENDING',
          endTime: {
            lte: now,
          },
        },
        orderBy: {
          endTime: 'asc',
        },
        take: 10, // Process in batches
      });

      if (actions.length > 0) {
        this.logger.log(`Found ${actions.length} pending actions`);
      }

      for (const action of actions) {
        await this.processAction(action);
      }
    } catch (error) {
      this.logger.error('Error during action polling', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAction(action: any) {
    const { id, type, villageId, data } = action;

    // 2. Lock action (Idempotency Check)
    // We update status to PROCESSING. If count is 0, someone else picked it up.
    // Since we are single-instance for this demo, standard update is fine.
    // But to be robust against double-runs if execution is slow and implicit start:
    // We verify strict status check in where clause.

    const updateResult = await this.prisma.actionQueue.updateMany({
      where: {
        id: id,
        status: 'PENDING', // Optimistic lock
      },
      data: {
        status: 'PROCESSING',
      },
    });

    if (updateResult.count === 0) {
      this.logger.warn(`Action ${id} already processed or locked`);
      return;
    }

    try {
      this.logger.log(`Executing Action ${id}: ${type}`);
      const payload = JSON.parse(data);

      // 3. Dispatch Logic
      if (type === 'BUILD_UPGRADE') {
        await this.buildingService.upgradeBuilding(
          villageId,
          payload.buildingType,
        );
      } else {
        this.logger.warn(`Unknown action type: ${type}`);
      }

      // 4. Mark Complete
      await this.prisma.actionQueue.update({
        where: { id: id },
        data: { status: 'COMPLETED' },
      });
      this.logger.log(`Action ${id} completed`);
    } catch (error) {
      this.logger.error(`Action ${id} failed`, error);
      // 5. Build Error Handling
      await this.prisma.actionQueue.update({
        where: { id: id },
        data: { status: 'FAILED' },
      });
    }
  }
}
