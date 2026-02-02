import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ResourceService } from './resources.service';
import { BuildingService } from './building.service';
import { PrismaService } from '../prisma.service';

@Controller('game')
export class GameController {
  constructor(
    private resourceService: ResourceService,
    private buildingService: BuildingService,
    private prisma: PrismaService,
  ) {}

  @Post('setup')
  async setup() {
    // Clear DB (Demo only)
    await this.prisma.actionQueue.deleteMany();
    await this.prisma.building.deleteMany();
    await this.prisma.resources.deleteMany();
    await this.prisma.village.deleteMany();
    await this.prisma.user.deleteMany();

    // Create User & Village
    const user = await this.prisma.user.create({
      data: {
        username: 'DemoUser',
        villages: {
          create: {
            name: 'Capital',
            resources: {
              create: { wood: 500, clay: 500, iron: 500, crop: 500 },
            },
          },
        },
      },
      include: { villages: true },
    });

    return { message: 'Setup Complete', user };
  }

  @Get('village/:id')
  async getVillage(@Param('id') id: string) {
    const villageId = parseInt(id, 10);
    // Trigger resource update logic
    const resources = await this.resourceService.getResources(villageId);

    const village = await this.prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    });

    return { ...village, resources };
  }

  @Post('village/:id/build')
  async build(@Param('id') id: string, @Body('type') type: string) {
    const villageId = parseInt(id, 10);
    return this.buildingService.startUpgrade(villageId, type);
  }
}
