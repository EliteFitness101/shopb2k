// Order Management — React Query hooks.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderRepository } from "./repository";
import { orderService } from "./service";

export function useMyOrders(limit = 50) {
  return useQuery({ queryKey: ["orders", "mine", limit], queryFn: () => orderRepository.listMyOrders(limit) });
}

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ["orders", "detail", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const id = orderId as string;
      const [order, items, shipments, timeline] = await Promise.all([
        orderRepository.findById(id),
        orderRepository.listItems(id),
        orderRepository.listShipments(id),
        orderRepository.listTimeline(id),
      ]);
      return order ? { ...order, items, shipments, timeline } : null;
    },
  });
}

export function useAllOrders(limit = 100) {
  return useQuery({ queryKey: ["orders", "all", limit], queryFn: () => orderRepository.listAllOrders(limit) });
}

export function useOrderStatusCounts() {
  return useQuery({ queryKey: ["orders", "status-counts"], queryFn: orderRepository.countByStatus });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useRequestReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderService.requestReturn,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
