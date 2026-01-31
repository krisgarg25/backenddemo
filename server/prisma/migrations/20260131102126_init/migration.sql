-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Village" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastTick" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Village_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "wood" REAL NOT NULL DEFAULT 0,
    "clay" REAL NOT NULL DEFAULT 0,
    "iron" REAL NOT NULL DEFAULT 0,
    "crop" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Resources_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Building" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "villageId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Building_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Village" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Resources_villageId_key" ON "Resources"("villageId");
