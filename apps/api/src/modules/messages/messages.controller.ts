import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('grupos/:groupId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const limit = Math.min(Math.max(Number(take) || 50, 1), 100);
    return this.messagesService.listByGroup(groupId, user.userId, limit, cursor);
  }

  @Post()
  async send(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.send(groupId, user.userId, dto.content);
  }
}
