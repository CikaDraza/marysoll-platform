// app/api/newsletter/subscribers/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { FilterQuery } from "mongoose";
import { IUser } from "@/types";

type NewsletterSubscribersQuery = FilterQuery<IUser>;

export async function GET(request: Request) {
  await connectToDB();

  const authResult: AdminAuthResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const subscriptionCondition = {
    $or: [
      { "newsletterPreferences.subscribed": true },
      { "notificationSettings.newsletterPromotions": true },
      { "notificationSettings.newsletterUpdates": true },
      { "notificationSettings.newsletterTips": true },
    ],
  };

  let query: NewsletterSubscribersQuery = subscriptionCondition;

  if (search) {
    query = {
      $and: [
        subscriptionCondition,
        {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
          ],
        },
      ],
    };
  }

  const subscribers = await User.find(query)
    .select("email name newsletterPreferences notificationSettings")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ "newsletterPreferences.subscriptionDate": -1 })
    .lean();

  const total = await User.countDocuments(query);

  return NextResponse.json({
    subscribers: subscribers.map((s) => ({
      _id: s._id,
      email: s.email,
      name: s.name || "Bez imena",
      source: s.newsletterPreferences ? "guest" : "registered",
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
