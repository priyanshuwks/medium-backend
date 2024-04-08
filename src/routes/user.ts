import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import {signinInput, signupInput} from "@raman00268/common1";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const body = await c.req.json();
    const signupValidate = signinInput.safeParse(body); // {success : true, data: data}
    if(!signupValidate.success){
        return c.json({
            message : "wrong input type",
            error : signupValidate.error
        });
    }
    try {
      const newUser = await prisma.user.create({
        data: {
          email: body.email,
          password: body.password,
        },
      });
      if (newUser) {
        c.status(201);
        const payload = { id: newUser.id };
        const jwt_Token = await sign(payload, c.env.JWT_SECRET);
        return c.json({
          status: "user created",
          jwt: jwt_Token,
        });     
      } else {
        c.status(404);
        return c.json({
          status: "user not created, failed",
        });
      }
    } catch (err) {
      c.status(403);
      return c.json({
        message: "error occured while signing up",
        error: err,
      });
    }
  });

//signin route
userRouter.post("/signin", async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
  
    try {
      const body = await c.req.json();
      const signinValidate = signinInput.safeParse(body);
      if(!signinValidate.success){
        return c.json({
            message : "input validation failed!",
            error : signinValidate.error
        })
      }
      const user = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
      });
      if (!user) {
        c.status(403);
        return c.json({
          message: "user not found",
        });
      }else{
          c.status(200);
          if(user.password == body.password){
              const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
              return c.json({
                  message : "login successful",
                  jwt
              })
          }else{
              c.status(401);
              return c.json({
                  message : 'entered password is incorrect'
              });
          }
          
      }
    } catch (err) {
      c.status(500);
      return c.json({
          message : 'error has occured',
          error : err
      });
    }
  });
  
  