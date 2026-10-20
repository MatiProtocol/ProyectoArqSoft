import type { PositionReadDto } from '../dtos/position-read.dto';

export interface IGpsReadingReadRepository {
  getRecentByTransfer(transferId: number, limit: number): Promise<PositionReadDto[]>;
}
