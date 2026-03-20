// pages/index.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  return {
    redirect: {
      destination: session ? "/dashboard" : "/login",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}
