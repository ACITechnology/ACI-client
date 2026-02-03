import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' }, // À restreindre en production
})
export class TicketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log(`🚀 Client connecté: ${client.id}`);
  }

  handleDisconnect(client: any) {
    console.log(`❌ Client déconnecté: ${client.id}`);
  }

  // Cette méthode sera appelée par ton Worker
  sendTicketUpdate(userId: number, ticket: any) {
  const timestamp = new Date().toISOString();
  console.log(`[WEBSOCKET] 📡 [${timestamp}] Envoi du signal 'ticket_finalized_${userId}'`);
  console.log(`[WEBSOCKET] 📦 Données envoyées: Ticket #${ticket.ticketNumber} (ID: ${ticket.id})`);
  
  this.server.emit(`ticket_finalized_${userId}`, ticket);
}
}