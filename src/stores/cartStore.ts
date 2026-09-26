import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MoneyV2, ShopifyProductNode } from "@/lib/shopify";
import { getAttribution } from "@/lib/attribution";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  lineId:string|null;
  product:Pick<ShopifyProductNode,"id"|"title"|"handle"|"sku"|"images">;
  variantId:string;
  variantTitle:string;
  price:MoneyV2;
  quantity:number;
  selectedOptions:Array<{name:string;value:string}>;
}
interface CartStore {items:CartItem[];cartId:string|null;checkoutUrl:string|null;isLoading:boolean;isSyncing:boolean;addItem:(item:Omit<CartItem,"lineId">)=>Promise<void>;updateQuantity:(variantId:string,quantity:number)=>Promise<void>;removeItem:(variantId:string)=>Promise<void>;clearCart:()=>void;syncCart:()=>Promise<void>;getCheckoutUrl:()=>string|null;}

function stableId(key:string):string {
  const existing=localStorage.getItem(key); if(existing)return existing;
  const id=crypto.randomUUID(); localStorage.setItem(key,id); return id;
}
async function syncCanonicalCart(items:CartItem[],cartToken:string|null){
  if(!cartToken)return;
  const {data:{session}}=await supabase.auth.getSession();
  const response=await fetch("https://resofit.fit/api/cart",{method:"POST",headers:{"content-type":"application/json",...(session?.access_token?{authorization:`Bearer ${session.access_token}`}: {})},body:JSON.stringify({
    cartToken,
    anonymousId:stableId("resofit:anonymous_id"),
    sessionId:sessionStorage.getItem("resofit:session_id")??(()=>{const id=crypto.randomUUID();sessionStorage.setItem("resofit:session_id",id);return id;})(),
    attribution:getAttribution(),
    items:items.map(i=>({sku:i.product.sku||i.variantId,title:i.product.title,variantId:i.variantId,quantity:i.quantity,unitPrice:Number(i.price.amount)||0,currency:i.price.currencyCode,metadata:{handle:i.product.handle,variantTitle:i.variantTitle,selectedOptions:i.selectedOptions}}))
  })});
  if(!response.ok) throw new Error("Canonical cart sync failed");
}

export const useCartStore=create<CartStore>()(persist((set,get)=>({
 items:[],cartId:null,checkoutUrl:null,isLoading:false,isSyncing:false,
 addItem:async(item)=>{set({isLoading:true});try{const current=get().items;const existing=current.find(i=>i.variantId===item.variantId);const next=existing?current.map(i=>i.variantId===item.variantId?{...i,quantity:i.quantity+item.quantity}:i):[...current,{...item,lineId:crypto.randomUUID()}];const cartId=get().cartId??crypto.randomUUID();set({items:next,cartId,checkoutUrl:null});void get().syncCart();}finally{set({isLoading:false});}},
 updateQuantity:async(variantId,quantity)=>{if(quantity<=0){await get().removeItem(variantId);return;}set({isLoading:true});try{set({items:get().items.map(i=>i.variantId===variantId?{...i,quantity}:i),checkoutUrl:null});void get().syncCart();}finally{set({isLoading:false});}},
 removeItem:async(variantId)=>{set({isLoading:true});try{const next=get().items.filter(i=>i.variantId!==variantId);set({items:next,cartId:next.length?get().cartId:null,checkoutUrl:null});void get().syncCart();}finally{set({isLoading:false});}},
 clearCart:()=>{set({items:[],cartId:null,checkoutUrl:null});},
 getCheckoutUrl:()=>null,
 syncCart:async()=>{const s=get();if(!s.items.length||!s.cartId)return;set({isSyncing:true});try{await syncCanonicalCart(s.items,s.cartId);}catch(error){console.warn("[cart] canonical sync deferred",error);}finally{set({isSyncing:false});}},
}),{name:"resofit-cart",storage:createJSONStorage(()=>localStorage),partialize:s=>({items:s.items,cartId:s.cartId,checkoutUrl:null})}));