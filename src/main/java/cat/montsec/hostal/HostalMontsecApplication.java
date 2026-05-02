package cat.montsec.hostal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class HostalMontsecApplication {

	public static void main(String[] args) {
		SpringApplication.run(HostalMontsecApplication.class, args);
	}

}
