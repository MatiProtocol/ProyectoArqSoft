import type { Request, Response } from 'express';
import { UpdateUserRolesCommand } from '../../application/commands/update-user-roles/update-user-roles.command';
import type { UpdateUserRolesHandler } from '../../application/commands/update-user-roles/update-user-roles.handler';

export class UserRolesController {
  constructor(private readonly commandHandler: UpdateUserRolesHandler) {}

  async updateRoles(req: Request, res: Response): Promise<void> {
    const command = UpdateUserRolesCommand.create(req.body, req.user?.roles);
    await this.commandHandler.execute(command);

    res.status(200).json({ message: 'Roles updated successfully' });
  }
}
