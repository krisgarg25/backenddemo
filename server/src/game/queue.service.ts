import { Injectable, Logger } from '@nestjs/common';

export interface Job {
  id: string;
  villageId: number;
  type: string;
  finishTime: Date;
  action: () => Promise<void>;
}

@Injectable()
export class QueueService {
  private jobs: Job[] = [];
  private readonly logger = new Logger(QueueService.name);

  // Add a job to the in-memory queue
  addJob(job: Job) {
    this.jobs.push(job);
    const delay = job.finishTime.getTime() - new Date().getTime();

    this.logger.log(
      `Job added: ${job.type} for Village ${job.villageId}. Finishes in ${delay / 1000}s`,
    );

    setTimeout(
      () => {
        void this.processJob(job);
      },
      Math.max(delay, 0),
    );
  }

  private async processJob(job: Job) {
    this.logger.log(`Processing Job: ${job.type} for Village ${job.villageId}`);
    try {
      await job.action();
      this.logger.log(`Job Complete: ${job.type}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Job Failed: ${message}`);
    } finally {
      this.jobs = this.jobs.filter((j) => j.id !== job.id);
    }
  }

  getJobs(villageId: number) {
    return this.jobs.filter((j) => j.villageId === villageId);
  }
}
