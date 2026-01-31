import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ResourceService {
  private readonly PRODUCTION_RATE = 10; // Resources per second

  constructor(private prisma: PrismaService) {}

  async getResources(villageId: number) {
    // 1. Fetch current state
    const village = await this.prisma.village.findUnique({
      where: { id: villageId },
      include: { resources: true },
    });

    if (!village || !village.resources) {
      throw new Error('Village or resources not found');
    }

    // 2. Calculate time difference
    const now = new Date();
    const lastTick = new Date(village.lastTick);
    const diffSeconds = (now.getTime() - lastTick.getTime()) / 1000;

    if (diffSeconds <= 0) {
      return village.resources;
    }

    // 3. Calculate production
    const produced = diffSeconds * this.PRODUCTION_RATE;
    const newWood = village.resources.wood + produced;
    const newClay = village.resources.clay + produced;
    const newIron = village.resources.iron + produced;
    const newCrop = village.resources.crop + produced;

    // 4. Update DB atomically
    // We update Resources AND LastTick together
    const [updatedResources] = await this.prisma.$transaction([
      this.prisma.resources.update({
        where: { id: village.resources.id },
        data: {
          wood: newWood,
          clay: newClay,
          iron: newIron,
          crop: newCrop,
        },
      }),
      this.prisma.village.update({
        where: { id: village.id },
        data: { lastTick: now },
      }),
    ]);

    return updatedResources;
  }

  // Deduct resources matching the cost
  async deductResources(
    villageId: number,
    cost: { wood: number; clay: number; iron: number; crop: number },
  ) {
    // Ensure we are up to date first
    const current = await this.getResources(villageId);

    if (
      current.wood < cost.wood ||
      current.clay < cost.clay ||
      current.iron < cost.iron ||
      current.crop < cost.crop
    ) {
      throw new Error('Insufficient resources');
    }

    // Deduct
    return this.prisma.resources.update({
      where: { id: current.id },
      data: {
        wood: { decrement: cost.wood },
        clay: { decrement: cost.clay },
        iron: { decrement: cost.iron },
        crop: { decrement: cost.crop },
      },
    });
  }
}
