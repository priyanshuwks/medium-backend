import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, verify } from "hono/jwt";
import { createBlogInput, updateBlogInput, getaBlogInput } from "@raman00268/common1";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables : {
    userId : string
  };
}>();

//writing the middleware for the blog route
blogRouter.use(async (c, next) => {
    console.log('middleware hit');
    const header = c.req.header("Authorization");
    if(!header){
        c.status(401);
        return c.json({
            message : "please provide token"
        })
    }
    const token = header?.split(" ")[1] || "";
    const payload = await verify(token, c.env.JWT_SECRET);
    if(!payload){
        c.status(401);
        return c.json({
            message : 'unauthorized'
        });
    }else{
        console.log('verified')
        // await next();
    }
    c.set('userId', payload.id);
    console.log(`c.set(userId) ${c.get('userId')}`);
    await next();
});

//route to create a blog
blogRouter.post('/', async (c) => {
    console.log('create rout hit');
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
    //input validation
    const createBlogValidation = createBlogInput.safeParse(body);
    if(!createBlogValidation.success){
        return c.json({
            message : 'input validation failed!',
            error : createBlogValidation.error
        });
    }
	const post = await prisma.post.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: userId
		}
	});
	return c.json({
		id: post.id
	});
});

//route to update an existing post
blogRouter.put('/:id', async (c) => {
    const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

    const post_id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    //input validation
    const updateBlogValidation = updateBlogInput.safeParse(body);
    if(!updateBlogValidation.success){
        return c.json({
            message : "input validation failed!",
            error : updateBlogValidation.error
        });
    }
    

    const post = await prisma.post.update({
        where : {
            id : post_id,
            authorId : userId
        },
        data : {
            title : body.title,
            content : body.content
        }
    });

    return c.json({
        message : 'post updated successfully'
    })

})

//get blog with given id

blogRouter.get('/:id', async (c) => {
    const post_id = c.req.param('id');
    //below object is just to match the type of object
    const blog_id = {
        id : post_id
    }
    const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

    //input validation
    const getBlogValidation = getaBlogInput.safeParse(blog_id);
    if(!getBlogValidation.success){
        return c.json({
            message : "input validation failed!",
            error : getBlogValidation.error
        });
    }
    const post = await prisma.post.findUnique({
        where : {
            id : post_id
        }
    });
    return c.json({
        message : 'fetch ok',
        data : post
    });

});
//below route is for how to get all blogs of an user
/*
blogRouter.get('/', async (c) => {
    // const userId = await c.get('userId');
    console.log('insde get routex');
    const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
    const blog = await prisma.post.findMany({
        where : {
            authorId : userId
        }
    });
    return c.json({
        message : 'fetch ok',
        data : blog
    });
});
*/

